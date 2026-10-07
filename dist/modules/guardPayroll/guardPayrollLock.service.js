"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollLockService = void 0;
const GuardPayrollRun_1 = require("../../models/GuardPayrollRun");
const types_1 = require("../../types");
const ApiError_1 = require("../../common/ApiError");
/**
 * PAYROLL LOCK — while a guard payroll run for a month is SUBMITTED or beyond,
 * guard attendance for that month is locked. Corrections require an explicit
 * RETURN (authorized payroll personnel), which re-opens the run and unlocks
 * attendance; recalculating and re-submitting locks it again. Approved/paid
 * months are therefore never silently changed.
 */
class GuardPayrollLockService {
    /** Lock state for one attendance period ("YYYY-MM"). */
    static async getLockInfo(periodKey) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findOne({ periodKey, status: { $in: this.LOCKING_STATUSES } });
        return {
            locked: !!run,
            runId: run ? run._id.toString() : null,
            runStatus: run ? run.status : null,
        };
    }
    /** Throws when the month's guard attendance is locked by payroll. */
    static async assertGuardAttendanceEditable(periodKey, action = 'edit guard attendance') {
        const info = await this.getLockInfo(periodKey);
        if (info.locked) {
            throw ApiError_1.ApiError.conflict(`Cannot ${action}: attendance for ${periodKey} is locked by Guard Payroll (status ${info.runStatus}). RETURN the payroll run for correction first.`);
        }
    }
}
exports.GuardPayrollLockService = GuardPayrollLockService;
GuardPayrollLockService.LOCKING_STATUSES = [
    types_1.PayrollRecordStatus.SUBMITTED,
    types_1.PayrollRecordStatus.CHECKED,
    types_1.PayrollRecordStatus.APPROVED,
    types_1.PayrollRecordStatus.PAYMENT_PROCESSING,
    types_1.PayrollRecordStatus.PAID,
];
//# sourceMappingURL=guardPayrollLock.service.js.map