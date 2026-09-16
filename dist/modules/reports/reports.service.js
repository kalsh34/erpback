"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const GuardPayrollRecord_1 = require("../../models/GuardPayrollRecord");
const StaffPayrollRecord_1 = require("../../models/StaffPayrollRecord");
class ReportsService {
    static async getPayrollSummary(payrollPeriodId) {
        const [guardRecords, staffRecords] = await Promise.all([
            GuardPayrollRecord_1.GuardPayrollRecord.find({ payrollPeriodId }).populate('guardId').populate('primarySiteId'),
            StaffPayrollRecord_1.StaffPayrollRecord.find({ payrollPeriodId }).populate('employeeId'),
        ]);
        const guardSummary = {
            totalGuards: guardRecords.length,
            totalGrossPay: guardRecords.reduce((sum, r) => sum + r.grossPay, 0),
            totalNetPay: guardRecords.reduce((sum, r) => sum + r.netPay, 0),
            totalTax: guardRecords.reduce((sum, r) => sum + r.incomeTax, 0),
            totalPension: guardRecords.reduce((sum, r) => sum + r.employeePension, 0),
        };
        const staffSummary = {
            totalStaff: staffRecords.length,
            totalGrossSalary: staffRecords.reduce((sum, r) => sum + r.grossSalary, 0),
            totalNetPay: staffRecords.reduce((sum, r) => sum + r.netPay, 0),
            totalTax: staffRecords.reduce((sum, r) => sum + r.incomeTax, 0),
            totalPension: staffRecords.reduce((sum, r) => sum + r.employeePension, 0),
        };
        return { guardSummary, staffSummary };
    }
    static async getSiteLaborCost(payrollPeriodId) {
        const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ payrollPeriodId })
            .populate('primarySiteId');
        const siteMap = new Map();
        records.forEach((r) => {
            const site = r.primarySiteId;
            const key = site?._id?.toString() || 'unknown';
            if (!siteMap.has(key)) {
                siteMap.set(key, { siteName: site?.siteName || 'Unknown', siteCode: site?.siteCode || 'N/A', totalCost: 0, guardCount: 0 });
            }
            const entry = siteMap.get(key);
            entry.totalCost += r.grossPay;
            entry.guardCount += 1;
        });
        return Array.from(siteMap.values());
    }
    static async getPaymentHistory(query) {
        const { startDate, endDate, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const filter = { status: 'PAID' };
        if (startDate && endDate) {
            filter.paymentDate = { $gte: startDate, $lte: endDate };
        }
        const [records, total] = await Promise.all([
            GuardPayrollRecord_1.GuardPayrollRecord.find(filter)
                .sort({ paymentDate: -1 })
                .skip(skip)
                .limit(limit)
                .populate('guardId'),
            GuardPayrollRecord_1.GuardPayrollRecord.countDocuments(filter),
        ]);
        return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
}
exports.ReportsService = ReportsService;
//# sourceMappingURL=reports.service.js.map