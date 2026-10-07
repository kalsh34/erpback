/**
 * GUARD PAYROLL (v2) — skeleton.
 *
 * The legacy guard payroll was removed. The new guard payroll system will be
 * built here once its calculation logic is defined by the owner.
 *
 * Available inputs already in the system:
 *  • GuardAttendanceRecord — daily hours per guard per site (periodKey month)
 *  • GuardMonthlyHours — monthly total sheets, classified into:
 *      normalHours / holidayHours / sundayHours
 *    (holiday & Sunday hours are the OT-rate hours in the new logic)
 *  • GuardMonthlyHoursService.getPayrollHours(year, month) —
 *    canonical feed: monthly sheets win, daily sums are the fallback
 *  • PrimarySiteAssignment (hourlyRate per guard+site)
 *
 * TODO(owner): define the guard payroll logic — hourly/OT rates per section,
 * allowances, deductions, taxes, pension and approval flow — and replace.
 */
import { Request, Response } from 'express';
export declare class GuardPayrollService {
    static getStatus(): {
        system: string;
        version: number;
        state: string;
        message: string;
        inputs: string[];
    };
    /** Placeholder so the module is reachable; replace with real endpoints. */
    static placeholder(_req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=guardPayroll.service.d.ts.map