import { PayrollRecordStatus } from '../../types';
/**
 * PAYROLL LOCK — while a guard payroll run for a month is SUBMITTED or beyond,
 * guard attendance for that month is locked. Corrections require an explicit
 * RETURN (authorized payroll personnel), which re-opens the run and unlocks
 * attendance; recalculating and re-submitting locks it again. Approved/paid
 * months are therefore never silently changed.
 */
export declare class GuardPayrollLockService {
    static LOCKING_STATUSES: PayrollRecordStatus[];
    /** Lock state for one attendance period ("YYYY-MM"). */
    static getLockInfo(periodKey: string): Promise<{
        locked: boolean;
        runId: string | null;
        runStatus: PayrollRecordStatus | null;
    }>;
    /** Throws when the month's guard attendance is locked by payroll. */
    static assertGuardAttendanceEditable(periodKey: string, action?: string): Promise<void>;
}
//# sourceMappingURL=guardPayrollLock.service.d.ts.map