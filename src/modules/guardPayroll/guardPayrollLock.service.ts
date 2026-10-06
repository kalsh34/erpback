import { GuardPayrollRun } from '../../models/GuardPayrollRun';
import { PayrollRecordStatus } from '../../types';
import { ApiError } from '../../common/ApiError';

/**
 * PAYROLL LOCK — while a guard payroll run for a month is SUBMITTED or beyond,
 * guard attendance for that month is locked. Corrections require an explicit
 * RETURN (authorized payroll personnel), which re-opens the run and unlocks
 * attendance; recalculating and re-submitting locks it again. Approved/paid
 * months are therefore never silently changed.
 */
export class GuardPayrollLockService {
  static LOCKING_STATUSES: PayrollRecordStatus[] = [
    PayrollRecordStatus.SUBMITTED,
    PayrollRecordStatus.CHECKED,
    PayrollRecordStatus.APPROVED,
    PayrollRecordStatus.PAYMENT_PROCESSING,
    PayrollRecordStatus.PAID,
  ];

  /** Lock state for one attendance period ("YYYY-MM"). */
  static async getLockInfo(periodKey: string): Promise<{ locked: boolean; runId: string | null; runStatus: PayrollRecordStatus | null }> {
    const run = await GuardPayrollRun.findOne({ periodKey, status: { $in: this.LOCKING_STATUSES } });
    return {
      locked: !!run,
      runId: run ? run._id.toString() : null,
      runStatus: run ? run.status : null,
    };
  }

  /** Throws when the month's guard attendance is locked by payroll. */
  static async assertGuardAttendanceEditable(periodKey: string, action = 'edit guard attendance') {
    const info = await this.getLockInfo(periodKey);
    if (info.locked) {
      throw ApiError.conflict(
        `Cannot ${action}: attendance for ${periodKey} is locked by Guard Payroll (status ${info.runStatus}). RETURN the payroll run for correction first.`
      );
    }
  }
}
