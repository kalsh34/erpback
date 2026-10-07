"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollService = void 0;
class GuardPayrollService {
    static getStatus() {
        return {
            system: 'GUARD_PAYROLL',
            version: 2,
            state: 'AWAITING_LOGIC_DEFINITION',
            message: 'Guard payroll is being rebuilt with its own system. Calculation logic is pending definition.',
            inputs: [
                'GuardAttendanceRecord (daily hours per site)',
                'GuardMonthlyHours (normal / holiday / sunday totals)',
                'PrimarySiteAssignment (hourly rates)',
            ],
        };
    }
    /** Placeholder so the module is reachable; replace with real endpoints. */
    static async placeholder(_req, res) {
        res.json({ success: true, data: this.getStatus() });
    }
}
exports.GuardPayrollService = GuardPayrollService;
//# sourceMappingURL=guardPayroll.service.js.map