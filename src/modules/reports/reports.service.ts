import { ApiError } from '../../common/ApiError';

/**
 * The legacy payroll reports were removed together with the old payroll
 * system. They will come back under the new staff/guard payroll design.
 */
export class ReportsService {
  static async getPayrollSummary(_payrollPeriodId: string) {
    throw ApiError.badRequest('Payroll summary report is retired with the old payroll - the new staff/guard payroll will provide its own reports.');
  }

  static async getSiteLaborCost(_payrollPeriodId: string) {
    throw ApiError.badRequest('Site labor cost report is retired with the old payroll - the new staff/guard payroll will provide its own reports.');
  }

  static async getPaymentHistory(_filter: { page: number; limit: number; guardId?: string }) {
    throw ApiError.badRequest('Payment history report is retired with the old payroll - the new staff/guard payroll will provide its own reports.');
  }
}
