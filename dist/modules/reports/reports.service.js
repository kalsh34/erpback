"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const ApiError_1 = require("../../common/ApiError");
/**
 * The legacy payroll reports were removed together with the old payroll
 * system. They will come back under the new staff/guard payroll design.
 */
class ReportsService {
    static async getPayrollSummary(_payrollPeriodId) {
        throw ApiError_1.ApiError.badRequest('Payroll summary report is retired with the old payroll - the new staff/guard payroll will provide its own reports.');
    }
    static async getSiteLaborCost(_payrollPeriodId) {
        throw ApiError_1.ApiError.badRequest('Site labor cost report is retired with the old payroll - the new staff/guard payroll will provide its own reports.');
    }
    static async getPaymentHistory(_filter) {
        throw ApiError_1.ApiError.badRequest('Payment history report is retired with the old payroll - the new staff/guard payroll will provide its own reports.');
    }
}
exports.ReportsService = ReportsService;
//# sourceMappingURL=reports.service.js.map