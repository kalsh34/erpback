import { AttendanceRecord, IAttendanceRecord } from '../../../models/AttendanceRecord';
import { AttendanceAuditLog } from '../../../models/AttendanceAuditLog';
import { User } from '../../../models/User';
import { Site } from '../../../models/Site';
import { Employee } from '../../../models/Employee';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { RotationAssignment } from '../../../models/RotationAssignment';
import { PayrollPeriod } from '../../../models/PayrollPeriod';
import { ApiError } from '../../../common/ApiError';
import { AttendanceSource, UserRole, PayrollPeriodStatus, EmployeeStatus } from '../../../types';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';
import mongoose from 'mongoose';

export class AttendanceService {
  static async clockIn(
    data: { guardId: string; siteId: string; isHoliday?: boolean },
    auditCtx?: { userId: string; ip?: string; ua?: string }
  ): Promise<IAttendanceRecord> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeShift = await AttendanceRecord.findOne({
      guardId: data.guardId,
      siteId: data.siteId,
      date: today,
      clockOut: null,
    });
    if (activeShift) throw ApiError.conflict('You already have an active shift. Please clock out first.');

    // NOTE: the former 48-hour "relief" rule was REMOVED per developer decision.
    // It blocked the incoming reliever from clocking in after a handover, leaving
    // sites unguarded. A guard may now relieve a site immediately.

    {
      const onDutyCount = await AttendanceRecord.countDocuments({
        siteId: data.siteId,
        date: today,
        clockOut: null,
      });
      if (onDutyCount === 0) {
        eventBus.emit('hr.attendance.noPredecessorOnDuty', {
          siteId: data.siteId,
          guardId: data.guardId,
        });
      }
    }

    const record = await AttendanceRecord.create({
      guardId: data.guardId,
      siteId: data.siteId,
      date: today,
      clockIn: new Date(),
      isHoliday: data.isHoliday || false,
    });

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'ATTENDANCE_CLOCK_IN',
        entity: 'AttendanceRecord',
        entityId: (record._id as any).toString(),
        newValues: {
          guardId: data.guardId,
          siteId: data.siteId,
          clockIn: record.clockIn,
        },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.attendance.clockIn', {
      recordId: record._id,
      guardId: data.guardId,
      siteId: data.siteId,
    });

    await AttendanceService.checkCoverageAlert(data.siteId);

    return record;
  }

  static async clockOut(
    guardId: string,
    data?: { siteId?: string; declaredRelieverId?: string; declaredRelieverSiteId?: string },
    auditCtx?: { userId: string; ip?: string; ua?: string }
  ): Promise<IAttendanceRecord> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter: any = { guardId, date: today, clockOut: null };
    if (data?.siteId) filter.siteId = data.siteId;

    const record = await AttendanceRecord.findOne(filter);
    if (!record) throw ApiError.badRequest('No open shift to clock out from');

    record.clockOut = new Date();
    record.totalHours = (record.clockOut.getTime() - record.clockIn!.getTime()) / (1000 * 60 * 60);

    if (data?.declaredRelieverId) {
      record.declaredRelieverId = new mongoose.Types.ObjectId(data.declaredRelieverId);
    }
    if (data?.declaredRelieverSiteId) {
      record.declaredRelieverSiteId = new mongoose.Types.ObjectId(data.declaredRelieverSiteId);
    }

    await record.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'ATTENDANCE_CLOCK_OUT',
        entity: 'AttendanceRecord',
        entityId: (record._id as any).toString(),
        newValues: {
          clockOut: record.clockOut,
          totalHours: record.totalHours,
          declaredRelieverId: data?.declaredRelieverId || null,
          declaredRelieverSiteId: data?.declaredRelieverSiteId || null,
        },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.attendance.clockOut', {
      recordId: record._id,
      guardId,
      totalHours: record.totalHours,
      declaredRelieverId: data?.declaredRelieverId || null,
      declaredRelieverSiteId: data?.declaredRelieverSiteId || null,
    });

    await AttendanceService.checkCoverageAlert((record.siteId as any).toString());

    return record;
  }

  static async overrideClockOut(
    recordId: string,
    reason: string,
    userId: string,
    auditCtx?: { ip?: string; ua?: string }
  ): Promise<IAttendanceRecord> {
    const editor = await User.findById(userId);
    if (!editor) throw ApiError.unauthorized('User not found');
    if (editor.role === UserRole.GUARD) throw ApiError.forbidden('Guards cannot override clock-outs. Contact Operations.');

    const record = await AttendanceRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Attendance record not found');
    if (record.clockOut) throw ApiError.badRequest('This shift is already clocked out.');

    const oldValue = { clockIn: record.clockIn, clockOut: record.clockOut, totalHours: record.totalHours };

    record.clockOut = new Date();
    record.totalHours = (record.clockOut.getTime() - record.clockIn!.getTime()) / (1000 * 60 * 60);
    record.overrideBy = userId as any;
    record.overrideReason = reason;
    record.source = AttendanceSource.OPERATIONS_EDIT;
    await record.save();

    await AttendanceAuditLog.create({
      attendanceRecordId: record._id,
      editedBy: userId,
      oldValue,
      newValue: { clockOut: record.clockOut, totalHours: record.totalHours, overrideReason: reason },
      reason: `OPERATIONS OVERRIDE: ${reason}`,
    });

    AuditService.log({
      userId,
      action: 'ATTENDANCE_OVERRIDE_CLOCK_OUT',
      entity: 'AttendanceRecord',
      entityId: recordId,
      oldValues: oldValue as unknown as Record<string, unknown>,
      newValues: { clockOut: record.clockOut, totalHours: record.totalHours, overrideReason: reason },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.attendance.overrideClockOut', {
      recordId,
      guardId: (record.guardId as any).toString(),
      overrideBy: userId,
      reason,
    });

    await AttendanceService.checkCoverageAlert((record.siteId as any).toString());

    return record;
  }

  static async getOnDutyGuardIds(siteId: string): Promise<string[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const records = await AttendanceRecord.find({
      siteId,
      date: today,
      clockOut: null,
    }).select('guardId');
    return records.map((r) => (r.guardId as any).toString());
  }

  static async checkCoverageAlert(siteId: string): Promise<{ understaffed: boolean; overstaffed: boolean; onDuty: number; required: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const site = await Site.findById(siteId);
    if (!site || site.agreedManpower === 0) return { understaffed: false, overstaffed: false, onDuty: 0, required: 0 };

    const onDuty = await AttendanceRecord.countDocuments({
      siteId,
      date: today,
      clockOut: null,
    });

    const understaffed = onDuty < site.agreedManpower;
    const overstaffed = onDuty > site.agreedManpower;

    if (understaffed) {
      eventBus.emit('hr.attendance.coverageAlert', {
        siteId,
        siteName: site.siteName,
        status: 'UNDERSTAFFED',
        onDuty,
        required: site.agreedManpower,
      });
    } else if (overstaffed) {
      eventBus.emit('hr.attendance.coverageAlert', {
        siteId,
        siteName: site.siteName,
        status: 'OVERSTAFFED',
        onDuty,
        required: site.agreedManpower,
      });
    }

    return { understaffed, overstaffed, onDuty, required: site.agreedManpower };
  }

  static async getActiveShift(guardId: string): Promise<IAttendanceRecord | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return AttendanceRecord.findOne({ guardId, date: today, clockOut: null }).populate('siteId');
  }

  static async getTodayRecord(guardId: string): Promise<IAttendanceRecord | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return AttendanceRecord.findOne({ guardId, date: today }).sort({ clockIn: -1 }).populate('siteId');
  }

  static async getRecentRecords(guardId: string, days: number): Promise<IAttendanceRecord[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    return AttendanceRecord.find({ guardId, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1, clockIn: -1 }).populate('siteId');
  }

  static async getGuardHours(guardId: string, startDate: Date, endDate: Date) {
    const records = await AttendanceRecord.find({ guardId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).populate('siteId');
    let totalHours = 0;
    let normalHours = 0;
    let holidayHours = 0;
    records.forEach((r) => {
      totalHours += r.totalHours;
      if (r.isHoliday) holidayHours += r.totalHours;
      else normalHours += r.totalHours;
    });
    return { totalHours, normalHours, holidayHours, records };
  }

  static async editHours(recordId: string, data: { totalHours: number; reason: string }, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IAttendanceRecord> {
    const editor = await User.findById(userId);
    if (!editor) throw ApiError.unauthorized('Editor not found');
    if (editor.role === UserRole.GUARD) throw ApiError.forbidden('Guards cannot modify attendance records. Contact HR or Operations for corrections.');

    const record = await AttendanceRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Attendance record not found');

    const oldValue = { totalHours: record.totalHours, clockIn: record.clockIn, clockOut: record.clockOut };

    await AttendanceAuditLog.create({
      attendanceRecordId: record._id,
      editedBy: userId,
      oldValue,
      newValue: { totalHours: data.totalHours },
      reason: data.reason,
    });

    record.totalHours = data.totalHours;
    record.source = AttendanceSource.OPERATIONS_EDIT;
    record.editReason = data.reason;
    record.editedBy = userId as any;
    await record.save();

    AuditService.log({
      userId,
      action: 'ATTENDANCE_EDIT_HOURS',
      entity: 'AttendanceRecord',
      entityId: recordId,
      oldValues: oldValue as unknown as Record<string, unknown>,
      newValues: { totalHours: data.totalHours, reason: data.reason },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.attendance.hoursEdited', { recordId, totalHours: data.totalHours, editedBy: userId });

    return record;
  }

  static async getByGuardAndPeriod(guardId: string, startDate: Date, endDate: Date): Promise<IAttendanceRecord[]> {
    return AttendanceRecord.find({ guardId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).populate('siteId');
  }

  static async getAllAttendance(startDate: Date, endDate: Date): Promise<IAttendanceRecord[]> {
    return AttendanceRecord.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).populate('guardId').populate('siteId');
  }

  private static async assertPeriodNotLocked(date: Date): Promise<void> {
    const period = await PayrollPeriod.findOne({
      startDate: { $lte: date },
      endDate: { $gte: date },
    });
    if (period && (period.status === PayrollPeriodStatus.LOCKED || period.status === PayrollPeriodStatus.CLOSED)) {
      throw ApiError.badRequest(
        `Payroll period ${period.monthName} ${period.year} is ${period.status.toLowerCase()}. ` +
        `Attendance cannot be ${date <= new Date() ? 'filed' : 'corrected'} for dates in a ${period.status.toLowerCase()} period. ` +
        `Use the RETURNED workflow to reopen the payroll record for this guard.`
      );
    }
  }

  static async manualEntry(
    data: {
      guardId: string;
      date: string;
      hoursWorked: number;
      siteId: string;
      isHoliday?: boolean;
      notes?: string;
    },
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<{ record: IAttendanceRecord; flagged?: string }> {
    const guard = await Employee.findById(data.guardId);
    if (!guard) throw ApiError.notFound('Guard not found');
    if (guard.category !== 'GUARD') throw ApiError.badRequest('Employee is not a guard');
    if (guard.status !== EmployeeStatus.CONTRACTED) {
      throw ApiError.badRequest('Guard must have an active contract before attendance can be filed');
    }

    const entryDate = new Date(data.date);
    entryDate.setHours(0, 0, 0, 0);

    const shiftAssignment = await ShiftAssignment.findOne({
      guardId: data.guardId,
      siteId: data.siteId,
      status: 'ACTIVE',
      startDate: { $lte: entryDate },
      $or: [
        { endDate: { $gte: entryDate } },
        { endDate: { $exists: false } },
        { endDate: null },
      ],
    });
    const rotationAssignment = shiftAssignment
      ? null
      : await RotationAssignment.findOne({
          guardId: data.guardId,
          siteId: data.siteId,
          date: entryDate,
        });
    if (!shiftAssignment && !rotationAssignment) {
      throw ApiError.badRequest(
        `No shift or rotation assignment found for this guard at this site on ${entryDate.toISOString().split('T')[0]} — assign a shift first.`
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (entryDate > today) {
      throw ApiError.badRequest('Cannot file attendance for a future date');
    }

    const existing = await AttendanceRecord.findOne({
      guardId: data.guardId,
      siteId: data.siteId,
      date: entryDate,
    });
    if (existing) {
      throw ApiError.badRequest(
        `Attendance record already exists for this guard at this site on ${entryDate.toISOString().split('T')[0]}. Use the update endpoint to correct it.`
      );
    }

    if (data.hoursWorked < 0 || data.hoursWorked > 24) {
      throw ApiError.badRequest('Hours worked must be between 0 and 24');
    }

    await AttendanceService.assertPeriodNotLocked(entryDate);

    let flagged: string | undefined;
    if (data.hoursWorked > 16) {
      flagged = `Unusual hours: ${data.hoursWorked}h exceeds 16h standard day. Verify double shift or extended coverage.`;
    }

    const record = await AttendanceRecord.create({
      guardId: data.guardId,
      siteId: data.siteId,
      date: entryDate,
      totalHours: data.hoursWorked,
      isHoliday: data.isHoliday || false,
      source: AttendanceSource.MANUAL_ENTRY,
      filedById: auditCtx.userId,
      filedAt: new Date(),
      notes: data.notes,
    });

    AuditService.log({
      userId: auditCtx.userId,
      action: 'ATTENDANCE_FILED',
      entity: 'AttendanceRecord',
      entityId: (record._id as any).toString(),
      newValues: {
        guardId: data.guardId,
        siteId: data.siteId,
        date: entryDate,
        hoursWorked: data.hoursWorked,
        isHoliday: data.isHoliday || false,
        source: 'MANUAL_ENTRY',
      },
      ipAddress: auditCtx.ip,
      userAgent: auditCtx.ua,
    });

    eventBus.emit('hr.attendance.manualEntry', {
      recordId: record._id,
      guardId: data.guardId,
      date: entryDate,
      hoursWorked: data.hoursWorked,
      filedBy: auditCtx.userId,
    });

    return { record, flagged };
  }

  static async manualEntryBulk(
    data: {
      siteId: string;
      entries: {
        guardId: string;
        date: string;
        hoursWorked: number;
        siteId?: string;
        isHoliday?: boolean;
        notes?: string;
      }[];
    },
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<{
    results: {
      guardId: string;
      date: string;
      status: 'created' | 'skipped';
      reason?: string;
      flagged?: string;
      recordId?: string;
    }[];
    summary: { created: number; skipped: number };
  }> {
    const results: {
      guardId: string;
      date: string;
      status: 'created' | 'skipped';
      reason?: string;
      flagged?: string;
      recordId?: string;
    }[] = [];

    for (const entry of data.entries) {
      try {
        const result = await AttendanceService.manualEntry(
          {
            guardId: entry.guardId,
            date: entry.date,
            hoursWorked: entry.hoursWorked,
            siteId: entry.siteId || data.siteId,
            isHoliday: entry.isHoliday,
            notes: entry.notes,
          },
          auditCtx
        );
        results.push({
          guardId: entry.guardId,
          date: entry.date,
          status: 'created',
          flagged: result.flagged,
          recordId: (result.record._id as any).toString(),
        });
      } catch (err: any) {
        results.push({
          guardId: entry.guardId,
          date: entry.date,
          status: 'skipped',
          reason: err.message || 'Unknown error',
        });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return { results, summary: { created, skipped } };
  }

  static async correctManualEntry(
    recordId: string,
    data: {
      hoursWorked?: number;
      isHoliday?: boolean;
      notes?: string;
      reason: string;
    },
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<IAttendanceRecord> {
    const record = await AttendanceRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Attendance record not found');
    if (record.source !== AttendanceSource.MANUAL_ENTRY) {
      throw ApiError.badRequest(
        'Cannot correct a self-clock record through this endpoint. Use the override endpoint for self-clock corrections.'
      );
    }

    await AttendanceService.assertPeriodNotLocked(new Date(record.date));

    const oldValue = {
      totalHours: record.totalHours,
      isHoliday: record.isHoliday,
      notes: record.notes,
    };

    if (data.hoursWorked !== undefined) {
      if (data.hoursWorked < 0 || data.hoursWorked > 24) {
        throw ApiError.badRequest('Hours worked must be between 0 and 24');
      }
      record.totalHours = data.hoursWorked;
    }
    if (data.isHoliday !== undefined) record.isHoliday = data.isHoliday;
    if (data.notes !== undefined) record.notes = data.notes;

    await record.save();

    await AttendanceAuditLog.create({
      attendanceRecordId: record._id,
      editedBy: auditCtx.userId,
      oldValue,
      newValue: {
        totalHours: record.totalHours,
        isHoliday: record.isHoliday,
        notes: record.notes,
      },
      reason: `MANUAL_ENTRY CORRECTION: ${data.reason}`,
    });

    AuditService.log({
      userId: auditCtx.userId,
      action: 'ATTENDANCE_CORRECTED',
      entity: 'AttendanceRecord',
      entityId: recordId,
      oldValues: oldValue as unknown as Record<string, unknown>,
      newValues: {
        totalHours: record.totalHours,
        isHoliday: record.isHoliday,
        notes: record.notes,
        reason: data.reason,
      },
      ipAddress: auditCtx.ip,
      userAgent: auditCtx.ua,
    });

    eventBus.emit('hr.attendance.manualEntryCorrected', {
      recordId,
      guardId: (record.guardId as any).toString(),
      correctedBy: auditCtx.userId,
      reason: data.reason,
    });

    return record;
  }
}
