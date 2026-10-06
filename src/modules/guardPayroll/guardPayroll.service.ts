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

export class GuardPayrollService {
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
  static async placeholder(_req: Request, res: Response) {
    res.json({ success: true, data: this.getStatus() });
  }
}
