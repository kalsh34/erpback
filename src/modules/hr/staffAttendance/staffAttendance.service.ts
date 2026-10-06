import { StaffAttendance, IStaffAttendance } from '../../../models/StaffAttendance';
import { Employee } from '../../../models/Employee';
import { ApiError } from '../../../common/ApiError';
import { StaffAttendanceStatus, EmployeeCategory } from '../../../types';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

const ymKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

export class StaffAttendanceService {
  static async saveDayStatus(data: {
    employeeId: string;
    year: number;
    month: number;
    dayOfMonth: number;
    status: StaffAttendanceStatus;
    leaveType?: string;
    notes?: string;
    recordedBy: string;
  }, auditCtx?: { ip?: string; ua?: string }): Promise<IStaffAttendance> {
    const daysInMonth = new Date(data.year, data.month, 0).getDate();
    if (data.dayOfMonth < 1 || data.dayOfMonth > daysInMonth) {
      throw ApiError.badRequest(`dayOfMonth must be between 1 and ${daysInMonth} for ${ymKey(data.year, data.month)}`);
    }

    const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.dayOfMonth).padStart(2, '0')}`;

    const existing = await StaffAttendance.findOne({
      employeeId: data.employeeId,
      periodKey: ymKey(data.year, data.month),
      dayOfMonth: data.dayOfMonth,
    });

    let record: IStaffAttendance;

    if (existing) {
      const oldStatus = existing.status;
      existing.status = data.status;
      existing.leaveType = data.leaveType;
      existing.notes = data.notes;
      existing.recordedBy = data.recordedBy as any;
      existing.source = 'HR_MANUAL' as any;
      await existing.save();
      record = existing;

      AuditService.log({
        userId: data.recordedBy,
        action: 'STAFF_ATTENDANCE_UPDATE',
        entity: 'StaffAttendance',
        entityId: (existing._id as any).toString(),
        oldValues: { status: oldStatus },
        newValues: { status: data.status },
        ipAddress: auditCtx?.ip,
        userAgent: auditCtx?.ua,
      });
    } else {
      record = await StaffAttendance.create({
        employeeId: data.employeeId,
        periodKey: ymKey(data.year, data.month),
        date: dateStr,
        dayOfMonth: data.dayOfMonth,
        status: data.status,
        leaveType: data.leaveType,
        notes: data.notes,
        recordedBy: data.recordedBy,
      });

      AuditService.log({
        userId: data.recordedBy,
        action: 'STAFF_ATTENDANCE_CREATE',
        entity: 'StaffAttendance',
        entityId: (record._id as any).toString(),
        newValues: { employeeId: data.employeeId, dayOfMonth: data.dayOfMonth, status: data.status },
        ipAddress: auditCtx?.ip,
        userAgent: auditCtx?.ua,
      });
    }

    eventBus.emit('hr.staffAttendance.dayMarked', { employeeId: data.employeeId, dayOfMonth: data.dayOfMonth, status: data.status });

    return record;
  }

  static async bulkMarkDay(data: {
    year: number;
    month: number;
    dayOfMonth: number;
    status: StaffAttendanceStatus;
    recordedBy: string;
  }, auditCtx?: { ip?: string; ua?: string }): Promise<IStaffAttendance[]> {
    const staff = await Employee.find({ category: EmployeeCategory.OFFICE_STAFF, status: { $in: ['ACTIVE', 'CONTRACTED'] } });
    const results: IStaffAttendance[] = [];

    for (const emp of staff) {
      const result = await this.saveDayStatus({
        employeeId: emp._id.toString(),
        year: data.year,
        month: data.month,
        dayOfMonth: data.dayOfMonth,
        status: data.status,
        recordedBy: data.recordedBy,
      }, auditCtx);
      results.push(result);
    }

    AuditService.log({
      userId: data.recordedBy,
      action: 'STAFF_ATTENDANCE_BULK_MARK',
      entity: 'StaffAttendance',
      newValues: { dayOfMonth: data.dayOfMonth, status: data.status, count: results.length },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.staffAttendance.bulkMarked', { dayOfMonth: data.dayOfMonth, status: data.status, count: results.length });

    return results;
  }

  static async getGrid(year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const staff = await Employee.find({ category: EmployeeCategory.OFFICE_STAFF, status: { $in: ['ACTIVE', 'CONTRACTED'] } }).sort({ employeeCode: 1 });

    const records = await StaffAttendance.find({ periodKey: ymKey(year, month) });
    const recordMap = new Map<string, StaffAttendanceStatus>();
    records.forEach((r) => {
      const key = `${r.employeeId}_${r.dayOfMonth}`;
      recordMap.set(key, r.status);
    });

    const grid = staff.map((emp) => {
      const days: Array<{ day: number; status: StaffAttendanceStatus | null; isWeekend: boolean }> = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = new Date(year, month - 1, d).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const key = `${emp._id}_${d}`;
        const status = recordMap.get(key) || null;
        days.push({ day: d, status, isWeekend });
      }
      return { employee: emp, days };
    });

    return { periodKey: ymKey(year, month), daysInMonth, grid };
  }

  static async getMonthlySummary(year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const staff = await Employee.find({ category: EmployeeCategory.OFFICE_STAFF, status: { $in: ['ACTIVE', 'CONTRACTED'] } }).sort({ employeeCode: 1 });
    const records = await StaffAttendance.find({ periodKey: ymKey(year, month) });

    const summaryMap = new Map<string, Record<string, number>>();
    staff.forEach((emp) => {
      summaryMap.set(emp._id.toString(), {
        PRESENT: 0, ABSENT: 0, PAID_LEAVE: 0, UNPAID_LEAVE: 0,
        SICK_LEAVE: 0, HALF_DAY: 0, HOLIDAY: 0, WEEKEND: 0,
      });
    });

    records.forEach((r) => {
      const counts = summaryMap.get(r.employeeId.toString());
      if (counts && counts[r.status] !== undefined) {
        counts[r.status]++;
      }
    });

    const summaries = staff.map((emp) => {
      const counts = summaryMap.get(emp._id.toString())!;
      const payableDays = counts.PRESENT + counts.HOLIDAY + counts.PAID_LEAVE + counts.SICK_LEAVE + counts.WEEKEND + (counts.HALF_DAY * 0.5);
      return {
        employee: emp,
        counts,
        payableDays,
        totalDaysInMonth: daysInMonth,
      };
    });

    return { periodKey: ymKey(year, month), daysInMonth, summaries };
  }
}
