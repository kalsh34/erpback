import { GuardShift, IGuardShift } from '../../../models/GuardShift';
import { GuardPatrolScan, IGuardPatrolScan } from '../../../models/GuardPatrolScan';
import { GuardAttendanceRecord } from '../../../models/GuardAttendanceRecord';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { Employee } from '../../../models/Employee';
import { User } from '../../../models/User';
import { Site } from '../../../models/Site';
import { ApiError } from '../../../common/ApiError';
import { ymdLocal } from '../../../common/dateUtils';
import { GuardAttendanceService } from './guardAttendance.service';
import { NotificationService } from '../../notifications/notification.service';
import { AttendanceSource, EmployeeCategory, EmployeeStatus, GuardAttendanceStatus } from '../../../types';

const ATTENDABLE_STATUSES: EmployeeStatus[] = [EmployeeStatus.ACTIVE, EmployeeStatus.CONTRACTED];

const round2 = (n: number) => Math.round(n * 100) / 100;

export class GuardShiftService {
  private static async resolveGuard(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.unauthorized('User not found');
    if (!user.employeeId) {
      throw ApiError.badRequest('This login is not linked to an employee record — ask HR to link your account to a guard profile');
    }
    const guard = await Employee.findById(user.employeeId);
    if (!guard) throw ApiError.notFound('Employee record not found');
    if (guard.category !== EmployeeCategory.GUARD) {
      throw ApiError.badRequest('Only guards can clock in and out');
    }
    if (!ATTENDABLE_STATUSES.includes(guard.status)) {
      throw ApiError.badRequest(`Your employment status (${guard.status}) does not allow clocking in`);
    }
    return { user, guard };
  }

  private static async assertAssignment(employeeId: string, siteId: string) {
    const assignment = await PrimarySiteAssignment.findOne({ guardId: employeeId, siteId });
    if (!assignment) throw ApiError.badRequest('You are not assigned to this site');
    if (!assignment.isCurrent) throw ApiError.badRequest('Your assignment to this site has ended');
    return assignment;
  }

  private static async notifyManagers(title: string, message: string, link: string, type: 'INFO' | 'SUCCESS') {
    try {
      await NotificationService.createForPermission('guard-attendance.manage', { title, message, link, type });
    } catch {
      // Notification failures must never break the shift itself.
    }
  }

  /** CLOCK IN — opens a shift for the scanned site. */
  static async clockIn(userId: string, siteId: string): Promise<IGuardShift> {
    const { guard } = await this.resolveGuard(userId);
    const site = await Site.findById(siteId);
    if (!site) throw ApiError.notFound('Site not found — the QR code may be outdated');
    if (site.status !== 'ACTIVE') throw ApiError.badRequest('This site is not active');
    await this.assertAssignment(guard._id as any, siteId);

    const open = await GuardShift.findOne({ guardUserId: userId, status: 'OPEN' });
    if (open) {
      throw ApiError.badRequest('You already have an open shift — clock out before starting a new one');
    }

    const now = new Date();
    const shift = await GuardShift.create({
      guardUserId: userId,
      employeeId: guard._id,
      siteId,
      date: ymdLocal(now),
      clockInAt: now,
      status: 'OPEN',
    });

    const guardName = `${guard.firstName} ${guard.lastName}`;
    await this.notifyManagers(
      'Guard clocked in',
      `${guardName} clocked in at ${site.siteName} (${site.siteCode}).`,
      '/attendance',
      'INFO'
    );
    return shift;
  }

  /** CLOCK OUT — closes the open shift and records the hours for payroll. */
  static async clockOut(userId: string): Promise<{ shift: IGuardShift; hours: number }> {
    const { guard } = await this.resolveGuard(userId);

    const shift = await GuardShift.findOne({ guardUserId: userId, status: 'OPEN' });
    if (!shift) throw ApiError.badRequest('No open shift — clock in first');

    const now = new Date();
    const hours = round2((now.getTime() - shift.clockInAt.getTime()) / 3_600_000);
    if (hours <= 0) {
      throw ApiError.badRequest('Shift is too short to record — clocked in less than a minute ago?');
    }

    // Push the real hours into the daily attendance row payroll consumes.
    // If HR/ops already entered an estimate for this guard+site+day, the row is
    // updated (previous value kept in changeHistory, source SELF_CLOCK).
    const { record } = await GuardAttendanceService.saveEntry({
      siteId: (shift.siteId as any).toString(),
      date: shift.date,
      entry: {
        guardId: (guard._id as any).toString(),
        hoursWorked: hours,
        notes: `Self clock ${shift.clockInAt.toISOString()} → ${now.toISOString()}`,
      },
      userId,
      source: AttendanceSource.SELF_CLOCK,
    });

    shift.clockOutAt = now;
    shift.computedHours = hours;
    shift.status = 'CLOSED';
    shift.attendanceRecordId = record._id as any;
    await shift.save();

    const site = await Site.findById(shift.siteId).select('siteName siteCode');
    const guardName = `${guard.firstName} ${guard.lastName}`;
    await this.notifyManagers(
      'Guard clocked out',
      `${guardName} clocked out at ${site?.siteName || 'site'} — ${hours}h recorded.`,
      '/attendance',
      'SUCCESS'
    );
    return { shift, hours };
  }

  /** Minimal site info for the guard scanner (guards have no SITE_READ permission). */
  static async getScanSite(siteId: string) {
    const site = await Site.findById(siteId).select('siteName siteCode location status');
    if (!site) throw ApiError.notFound('Site not found — the QR code may be outdated');
    return site;
  }

  /** PATROL SCAN — the guard scans a site QR while on an open shift at that site. */
  static async recordPatrol(userId: string, siteId: string): Promise<IGuardPatrolScan> {
    const { guard } = await this.resolveGuard(userId);
    const shift = await GuardShift.findOne({ guardUserId: userId, status: 'OPEN' });
    if (!shift) throw ApiError.badRequest('Clock in before patrolling — you have no open shift');
    if (shift.siteId.toString() !== siteId) {
      throw ApiError.badRequest('This QR code is for a different site than your open shift');
    }

    const now = new Date();
    return GuardPatrolScan.create({
      shiftId: shift._id,
      guardUserId: userId,
      employeeId: guard._id,
      siteId: shift.siteId,
      date: shift.date,
      scannedAt: now,
    });
  }

  /** Admin view: shifts and patrol scans in a date range (YYYY-MM-DD, inclusive). */
  static async listActivity(filters: { from?: string; to?: string; siteId?: string; employeeId?: string }) {
    const from = filters.from || ymdLocal(new Date());
    const to = filters.to || from;
    const shiftQuery: Record<string, unknown> = { date: { $gte: from, $lte: to } };
    const scanQuery: Record<string, unknown> = { date: { $gte: from, $lte: to } };
    if (filters.siteId) {
      shiftQuery.siteId = filters.siteId;
      scanQuery.siteId = filters.siteId;
    }
    if (filters.employeeId) {
      shiftQuery.employeeId = filters.employeeId;
      scanQuery.employeeId = filters.employeeId;
    }

    const [shifts, patrols] = await Promise.all([
      GuardShift.find(shiftQuery).sort({ clockInAt: -1 }).limit(500)
        .populate('employeeId', 'firstName lastName employeeCode')
        .populate('siteId', 'siteName siteCode'),
      GuardPatrolScan.find(scanQuery).sort({ scannedAt: -1 }).limit(1000)
        .populate('employeeId', 'firstName lastName employeeCode')
        .populate('siteId', 'siteName siteCode'),
    ]);
    return { from, to, shifts, patrols };
  }

  /** Guard portal data: shifts (with patrol counts), open shift, today's rows, month total. */
  static async getMyShifts(userId: string, limit = 60) {
    const { guard } = await this.resolveGuard(userId).catch(() => ({ guard: null }));
    if (!guard) {
      return { shifts: [], openShift: null, todayRecords: [], monthHours: 0, periodKey: ymdLocal(new Date()).slice(0, 7) };
    }

    const today = ymdLocal(new Date());
    const periodKey = today.slice(0, 7);

    const [shifts, openShift, todayRecords] = await Promise.all([
      GuardShift.find({ guardUserId: userId }).sort({ clockInAt: -1 }).limit(Math.min(limit, 200))
        .populate('siteId', 'siteName siteCode location'),
      GuardShift.findOne({ guardUserId: userId, status: 'OPEN' })
        .populate('siteId', 'siteName siteCode location'),
      GuardAttendanceRecord.find({ guardId: guard._id, date: today, status: GuardAttendanceStatus.ACTIVE })
        .populate('siteId', 'siteName siteCode'),
    ]);

    // Patrol counts per shift, so the guard sees how many rounds each shift had.
    const shiftIds = shifts.map((s) => s._id);
    const counts = await GuardPatrolScan.aggregate([
      { $match: { shiftId: { $in: shiftIds } } },
      { $group: { _id: '$shiftId', count: { $sum: 1 } } },
    ]);
    const countByShift = new Map<string, number>(counts.map((c) => [c._id.toString(), c.count]));
    const shiftsWithPatrols = shifts.map((s) => ({
      ...s.toObject(),
      patrolCount: countByShift.get(s._id.toString()) || 0,
    }));

    const monthRecords = await GuardAttendanceRecord.find({
      guardId: guard._id,
      periodKey,
      status: GuardAttendanceStatus.ACTIVE,
    }).select('hoursWorked');
    const monthHours = round2(monthRecords.reduce((s, r) => s + r.hoursWorked, 0));

    return { shifts: shiftsWithPatrols, openShift, todayRecords, monthHours, periodKey };
  }
}
