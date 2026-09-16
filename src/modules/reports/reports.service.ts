import { GuardPayrollRecord } from '../../models/GuardPayrollRecord';
import { StaffPayrollRecord } from '../../models/StaffPayrollRecord';
import { AttendanceRecord } from '../../models/AttendanceRecord';
import { Site } from '../../models/Site';
import { Employee } from '../../models/Employee';

export class ReportsService {
  static async getPayrollSummary(payrollPeriodId: string) {
    const [guardRecords, staffRecords] = await Promise.all([
      GuardPayrollRecord.find({ payrollPeriodId }).populate('guardId').populate('primarySiteId'),
      StaffPayrollRecord.find({ payrollPeriodId }).populate('employeeId'),
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

  static async getSiteLaborCost(payrollPeriodId: string) {
    const records = await GuardPayrollRecord.find({ payrollPeriodId })
      .populate('primarySiteId');

    const siteMap = new Map<string, { siteName: string; siteCode: string; totalCost: number; guardCount: number }>();

    records.forEach((r) => {
      const site = r.primarySiteId as any;
      const key = site?._id?.toString() || 'unknown';
      if (!siteMap.has(key)) {
        siteMap.set(key, { siteName: site?.siteName || 'Unknown', siteCode: site?.siteCode || 'N/A', totalCost: 0, guardCount: 0 });
      }
      const entry = siteMap.get(key)!;
      entry.totalCost += r.grossPay;
      entry.guardCount += 1;
    });

    return Array.from(siteMap.values());
  }

  static async getPaymentHistory(query: { startDate?: Date; endDate?: Date; page?: number; limit?: number }) {
    const { startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const filter: any = { status: 'PAID' };
    if (startDate && endDate) {
      filter.paymentDate = { $gte: startDate, $lte: endDate };
    }

    const [records, total] = await Promise.all([
      GuardPayrollRecord.find(filter)
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('guardId'),
      GuardPayrollRecord.countDocuments(filter),
    ]);

    return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
