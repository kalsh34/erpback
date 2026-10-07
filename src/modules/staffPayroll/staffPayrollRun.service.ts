import mongoose from 'mongoose';
import { StaffPayrollRun, IStaffPayrollRun } from '../../models/StaffPayrollRun';
import { StaffPayrollRecord } from '../../models/StaffPayrollRecord';
import { Employee } from '../../models/Employee';
import { Contract } from '../../models/Contract';
import { StaffOvertimeEntry, StaffBonus } from '../../models/StaffPayrollEntries';
import { computeStaffPayroll, round2 } from './staffPayrollEngine';
import { StatutoryService } from '../payrollCommon/statutory.service';
import { DeductionsService } from '../payrollCommon/deductions.service';
import { AttendanceSummaryService } from '../payrollCommon/attendanceSummary.service';
import { ApiError } from '../../common/ApiError';
import { AuditService } from '../../core/audit/AuditService';
import { EmployeeCategory, EmployeeStatus, PayrollRecordStatus, DeductionStatus } from '../../types';

interface AuditCtx { ip?: string; ua?: string }

const EDITABLE_STATUSES = [PayrollRecordStatus.DRAFT, PayrollRecordStatus.CALCULATED, PayrollRecordStatus.RETURNED];

function monthWindow(periodKey: string) {
  if (!/^\d{4}-\d{2}$/.test(periodKey)) throw ApiError.badRequest('periodKey must be in YYYY-MM format');
  const [year, month] = periodKey.split('-').map(Number);
  if (month < 1 || month > 12) throw ApiError.badRequest('periodKey month must be between 01 and 12');
  return {
    year,
    month,
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

/**
 * STAFF PAYROLL RUN SERVICE — contract-driven, high-performance batch calculations.
 */
export class StaffPayrollRunService {
  // ───────────────────────────────────────────────────────────────────
  // Calculation
  // ───────────────────────────────────────────────────────────────────

  static async calculate(periodKey: string, userId: string, auditCtx?: AuditCtx) {
    const { start, end } = monthWindow(periodKey);

    let run = await StaffPayrollRun.findOne({ periodKey });
    if (run && !EDITABLE_STATUSES.includes(run.status)) {
      throw ApiError.conflict(
        `Staff payroll for ${periodKey} is ${run.status}. RETURN it for correction before recalculating.`
      );
    }
    if (!run) {
      run = await StaffPayrollRun.create({ periodKey, status: PayrollRecordStatus.DRAFT });
    }
    const wasReturned = run.status === PayrollRecordStatus.RETURNED;

    const [pensionRule, taxTable] = await Promise.all([
      StatutoryService.getPensionRuleForPeriod(start, 'STAFF'),
      StatutoryService.getTaxTableForPeriod(start, 'STAFF'),
    ]);
    const taxBrackets = taxTable?.brackets?.length ? taxTable.brackets : [];

    const employees = await Employee.find({
      category: EmployeeCategory.OFFICE_STAFF,
      status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.CONTRACTED] },
    }).sort({ employeeCode: 1 });

    const employeeIds = employees.map((e) => e._id);

    // Parallel batch queries for contracts, OT, bonus, and deductions
    const [contracts, otEntries, bonusEntries, deductionsMap] = await Promise.all([
      Contract.find({
        employeeId: { $in: employeeIds },
        status: 'ACTIVE',
        contractStartDate: { $lte: end },
        $or: [{ contractEndDate: null }, { contractEndDate: { $exists: false } }, { contractEndDate: { $gte: start } }],
      }).sort({ contractStartDate: -1 }),
      StaffOvertimeEntry.find({ employeeId: { $in: employeeIds }, periodKey, status: DeductionStatus.ACTIVE }),
      StaffBonus.find({ employeeId: { $in: employeeIds }, periodKey, status: DeductionStatus.ACTIVE }),
      DeductionsService.listForPeriodBatch(employeeIds, periodKey),
    ]);

    const contractsByEmployee = new Map<string, any[]>();
    for (const c of contracts) {
      const key = c.employeeId.toString();
      if (!contractsByEmployee.has(key)) contractsByEmployee.set(key, []);
      contractsByEmployee.get(key)!.push(c);
    }

    const otByEmployee = new Map<string, number>();
    for (const e of otEntries) {
      const k = e.employeeId.toString();
      otByEmployee.set(k, round2((otByEmployee.get(k) || 0) + e.amount));
    }

    const bonusByEmployee = new Map<string, number>();
    for (const b of bonusEntries) {
      const k = b.employeeId.toString();
      bonusByEmployee.set(k, round2((bonusByEmployee.get(k) || 0) + b.amount));
    }

    const problems: IStaffPayrollRun['problems'] = [];
    const recordDocs: any[] = [];

    for (const employee of employees) {
      const key = employee._id.toString();
      const employeeContracts = contractsByEmployee.get(key) || [];
      const employeeName = `${employee.firstName} ${employee.lastName}`.trim();

      if (employeeContracts.length === 0) {
        problems.push({
          employeeId: employee._id,
          employeeCode: employee.employeeCode,
          employeeName,
          code: 'NO_ACTIVE_CONTRACT',
          message: `${employeeName} (${employee.employeeCode}) has no active contract covering ${periodKey} — create the contract first.`,
        });
        continue;
      }
      if (employeeContracts.length > 1) {
        problems.push({
          employeeId: employee._id,
          employeeCode: employee.employeeCode,
          employeeName,
          code: 'MULTIPLE_ACTIVE_CONTRACTS',
          message: `${employeeName} (${employee.employeeCode}) has ${employeeContracts.length} active contracts covering ${periodKey} — exactly one is required.`,
        });
        continue;
      }

      const contract = employeeContracts[0];
      const deductions = deductionsMap.get(key) || [];
      const overtimeAmount = otByEmployee.get(key) || 0;
      const bonusAmount = bonusByEmployee.get(key) || 0;

      const result = computeStaffPayroll({
        contract: {
          contractId: contract._id.toString(),
          basic: contract.wage || 0,
          responsibilityAllowance: contract.responsibilityAllowance || 0,
          teleAllowance: contract.teleAllowance || 0,
          taxableTransport: contract.taxableTransport || 0,
          nonTaxableTransport: contract.nonTaxableAllowance || 0,
          pensionEnrolled: contract.pensionEnrolled !== false,
        },
        overtimeAmount,
        bonusAmount,
        deductions,
        taxBrackets,
        pension: pensionRule
          ? {
              employeePercent: pensionRule.employeePercent,
              employerPercent: pensionRule.employerPercent,
              minPensionableSalary: pensionRule.minPensionableSalary,
              maxPensionableSalary: pensionRule.maxPensionableSalary,
            }
          : null,
      });

      recordDocs.push({
        runId: run._id,
        periodKey,
        employeeId: employee._id,
        snapshot: {
          employeeCode: employee.employeeCode,
          fullName: employeeName,
          bankName: employee.bankName,
          accountNumber: employee.accountNumber,
          department: contract.department || employee.department || undefined,
          jobPosition: contract.jobPosition || employee.position || undefined,
          contractId: contract._id.toString(),
          contractType: contract.contractType,
          basic: round2(contract.wage || 0),
          responsibilityAllowance: round2(contract.responsibilityAllowance || 0),
          teleAllowance: round2(contract.teleAllowance || 0),
          taxableTransport: round2(contract.taxableTransport || 0),
          nonTaxableTransport: round2(contract.nonTaxableAllowance || 0),
          pensionEnrolled: contract.pensionEnrolled !== false,
        },
        overtimeAmount: result.overtimeAmount,
        bonusAmount: result.bonusAmount,
        grossEarnings: result.grossEarnings,
        taxableEarnings: result.taxableEarnings,
        employeePension: result.employeePension,
        employerPension: result.employerPension,
        incomeTax: result.incomeTax,
        deductions: result.deductions.map((d) => ({ ...d, deductionId: d.deductionId as any })),
        totalDeductions: result.totalDeductions,
        netPay: result.netPay,
        bonus: result.bonus,
        finalAmountPaid: result.finalAmountPaid,
        warnings: result.warnings,
      });
    }

    // Atomically replace previous records in bulk
    await StaffPayrollRecord.deleteMany({ runId: run._id });
    const records = recordDocs.length > 0 ? await StaffPayrollRecord.insertMany(recordDocs) : [];

    const totals = {
      employees: records.length,
      grossEarnings: round2(records.reduce((s, r) => s + r.grossEarnings, 0)),
      employeePension: round2(records.reduce((s, r) => s + r.employeePension, 0)),
      employerPension: round2(records.reduce((s, r) => s + r.employerPension, 0)),
      incomeTax: round2(records.reduce((s, r) => s + r.incomeTax, 0)),
      totalDeductions: round2(records.reduce((s, r) => s + r.totalDeductions, 0)),
      netPay: round2(records.reduce((s, r) => s + r.netPay, 0)),
      bonus: round2(records.reduce((s, r) => s + r.bonus, 0)),
      finalAmountPaid: round2(records.reduce((s, r) => s + r.finalAmountPaid, 0)),
    };

    run.status = PayrollRecordStatus.CALCULATED;
    run.calculatedBy = userId as any;
    run.calculatedAt = new Date();
    run.problems = problems;
    run.totals = totals;
    await run.save();

    await AuditService.log({
      userId,
      action: wasReturned ? 'STAFF_PAYROLL_RECALCULATE' : 'STAFF_PAYROLL_CALCULATE',
      entity: 'StaffPayrollRun',
      entityId: run._id.toString(),
      newValues: { periodKey, status: run.status, employees: totals.employees, netPay: totals.netPay, problems: problems.length },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });

    return this.getRun(run._id.toString());
  }

  static async recalculate(runId: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    if (!EDITABLE_STATUSES.includes(run.status)) {
      throw ApiError.conflict(
        `Staff payroll for ${run.periodKey} is ${run.status}. RETURN it for correction before recalculating.`
      );
    }
    return this.calculate(run.periodKey, userId, auditCtx);
  }

  // ───────────────────────────────────────────────────────────────────
  // Reads
  // ───────────────────────────────────────────────────────────────────

  static async listRuns(filters: { periodKey?: string; status?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filters.periodKey) query.periodKey = filters.periodKey;
    if (filters.status) query.status = filters.status;
    return StaffPayrollRun.find(query).sort({ periodKey: -1 }).limit(120);
  }

  static async getRun(runId: string) {
    const run = await StaffPayrollRun.findById(runId);
    if (!run) throw ApiError.notFound('Staff payroll run not found');
    const records = await StaffPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });

    const attendance = await AttendanceSummaryService.forRun(
      'STAFF',
      run.periodKey,
      records.map((r) => r.employeeId.toString())
    );

    return { run, records, attendance };
  }

  static async getRecord(recordId: string) {
    if (!recordId || !mongoose.Types.ObjectId.isValid(recordId)) {
      throw ApiError.badRequest(`Invalid record ID: "${recordId}"`);
    }
    const record = await StaffPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Staff payroll record not found');
    return record;
  }

  // ───────────────────────────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────────────────────────

  private static async loadRun(runId: string): Promise<IStaffPayrollRun> {
    if (!runId || !mongoose.Types.ObjectId.isValid(runId)) {
      throw ApiError.badRequest(`Invalid run ID: "${runId}"`);
    }
    const run = await StaffPayrollRun.findById(runId);
    if (!run) throw ApiError.notFound('Staff payroll run not found');
    return run;
  }

  private static assertStatus(run: IStaffPayrollRun, allowed: PayrollRecordStatus[], action: string) {
    if (!allowed.includes(run.status)) {
      throw ApiError.conflict(`Cannot ${action}: payroll is ${run.status} (expected ${allowed.join(' or ')}).`);
    }
  }

  static async submit(runId: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    this.assertStatus(run, [PayrollRecordStatus.CALCULATED], 'submit');
    if (run.problems.length > 0) {
      throw ApiError.badRequest(`Resolve ${run.problems.length} payroll problem(s) before submitting.`);
    }
    run.status = PayrollRecordStatus.SUBMITTED;
    run.submittedBy = userId as any;
    run.submittedAt = new Date();
    await run.save();
    await this.log(userId, 'STAFF_PAYROLL_SUBMIT', run, auditCtx);
    return this.getRun(runId);
  }

  static async check(runId: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    this.assertStatus(run, [PayrollRecordStatus.SUBMITTED], 'check');
    run.status = PayrollRecordStatus.CHECKED;
    run.checkedBy = userId as any;
    run.checkedAt = new Date();
    await run.save();
    await this.log(userId, 'STAFF_PAYROLL_CHECK', run, auditCtx);
    return this.getRun(runId);
  }

  static async approve(runId: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    this.assertStatus(run, [PayrollRecordStatus.CHECKED], 'approve');
    run.status = PayrollRecordStatus.APPROVED;
    run.approvedBy = userId as any;
    run.approvedAt = new Date();
    await run.save();

    const records = await StaffPayrollRecord.find({ runId: run._id });
    await DeductionsService.settleRun(records as any);

    await this.log(userId, 'STAFF_PAYROLL_APPROVE', run, auditCtx);
    return this.getRun(runId);
  }

  /**
   * SUBMITTED / CHECKED / APPROVED → RETURNED.
   * If returned after approval, loan settlements are safely rolled back to prevent double deduction.
   */
  static async returnForCorrection(runId: string, reason: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    if (!reason || !reason.trim()) throw ApiError.badRequest('A reason is required to return payroll for correction');
    this.assertStatus(
      run,
      [PayrollRecordStatus.SUBMITTED, PayrollRecordStatus.CHECKED, PayrollRecordStatus.APPROVED],
      'return'
    );
    const wasApproved = run.status === PayrollRecordStatus.APPROVED;

    run.status = PayrollRecordStatus.RETURNED;
    run.returnReason = reason.trim();
    run.returnedBy = userId as any;
    run.returnedAt = new Date();
    run.returnHistory.push({
      reason: reason.trim(),
      by: userId as any,
      at: new Date(),
      fromStatus: wasApproved ? PayrollRecordStatus.APPROVED : PayrollRecordStatus.CHECKED,
    });
    await run.save();

    if (wasApproved) {
      const records = await StaffPayrollRecord.find({ runId: run._id });
      await DeductionsService.revertRun(records as any);
    }

    await this.log(userId, 'STAFF_PAYROLL_RETURN', run, auditCtx, reason.trim());
    return this.getRun(runId);
  }

  static async markPaid(runId: string, paymentRef: string | undefined, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    this.assertStatus(run, [PayrollRecordStatus.APPROVED], 'mark paid');
    run.status = PayrollRecordStatus.PAID;
    run.paidBy = userId as any;
    run.paidAt = new Date();
    if (paymentRef) run.paymentRef = paymentRef;
    await run.save();
    await this.log(userId, 'STAFF_PAYROLL_PAY', run, auditCtx);
    return this.getRun(runId);
  }

  // ───────────────────────────────────────────────────────────────────
  // Exports & Payslips
  // ───────────────────────────────────────────────────────────────────

  /** Export bank disbursement batch CSV (CBE / Awash / Dashen / All). */
  static async exportBankDisbursement(runId: string, bankFilter?: string) {
    const run = await StaffPayrollRun.findById(runId);
    if (!run) throw ApiError.notFound('Staff payroll run not found');
    const records = await StaffPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });

    const filtered = bankFilter && bankFilter !== 'ALL'
      ? records.filter((r) => (r.snapshot.bankName || '').toLowerCase().includes(bankFilter.toLowerCase()))
      : records;

    const headers = ['Employee Code', 'Beneficiary Full Name', 'Department', 'Bank Name', 'Account Number', 'Net Amount Paid (ETB)', 'Reference', 'Narration'];
    const rows = filtered.map((r) => [
      r.snapshot.employeeCode || '',
      `"${(r.snapshot.fullName || '').replace(/"/g, '""')}"`,
      `"${(r.snapshot.department || '').replace(/"/g, '""')}"`,
      `"${(r.snapshot.bankName || 'CBE').replace(/"/g, '""')}"`,
      `"${r.snapshot.accountNumber || ''}"`,
      r.finalAmountPaid.toFixed(2),
      `"PAY-${run.periodKey}-${r.snapshot.employeeCode || ''}"`,
      `"Vital Security Office Staff Salary ${run.periodKey}"`,
    ]);

    return {
      filename: `staff-bank-disbursement-${run.periodKey}${bankFilter ? `-${bankFilter}` : ''}.csv`,
      csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
    };
  }

  /** Statutory income tax schedule export (ERCA). */
  static async exportTaxReport(runId: string) {
    const run = await StaffPayrollRun.findById(runId);
    if (!run) throw ApiError.notFound('Staff payroll run not found');
    const records = await StaffPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });

    const headers = [
      'Employee Code',
      'Full Name',
      'Department',
      'Basic Salary (ETB)',
      'Gross Salary (ETB)',
      'Non-Taxable Transport (ETB)',
      'Taxable Earnings (ETB)',
      'Tax Withheld (ETB)',
      'Period',
    ];
    const rows = records.map((r) => [
      r.snapshot.employeeCode || '',
      `"${(r.snapshot.fullName || '').replace(/"/g, '""')}"`,
      `"${(r.snapshot.department || '').replace(/"/g, '""')}"`,
      r.snapshot.basic.toFixed(2),
      r.grossEarnings.toFixed(2),
      r.snapshot.nonTaxableTransport.toFixed(2),
      r.taxableEarnings.toFixed(2),
      r.incomeTax.toFixed(2),
      run.periodKey,
    ]);

    return {
      filename: `staff-tax-declaration-${run.periodKey}.csv`,
      csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
    };
  }

  /** Statutory pension schedule export (POESSA 7% / 11%). */
  static async exportPensionReport(runId: string) {
    const run = await StaffPayrollRun.findById(runId);
    if (!run) throw ApiError.notFound('Staff payroll run not found');
    const records = await StaffPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });

    const headers = [
      'Employee Code',
      'Full Name',
      'Department',
      'Pension Enrolled',
      'Basic Salary Base (ETB)',
      'Employee Share 7% (ETB)',
      'Employer Share 11% (ETB)',
      'Total POESSA Remittance 18% (ETB)',
      'Period',
    ];
    const rows = records.map((r) => [
      r.snapshot.employeeCode || '',
      `"${(r.snapshot.fullName || '').replace(/"/g, '""')}"`,
      `"${(r.snapshot.department || '').replace(/"/g, '""')}"`,
      r.snapshot.pensionEnrolled ? 'YES' : 'NO',
      r.snapshot.basic.toFixed(2),
      r.employeePension.toFixed(2),
      r.employerPension.toFixed(2),
      round2(r.employeePension + r.employerPension).toFixed(2),
      run.periodKey,
    ]);

    return {
      filename: `staff-pension-poessa-${run.periodKey}.csv`,
      csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
    };
  }

  /** Formatted Official Staff Payslip Document Data. */
  static async getPayslip(recordId: string) {
    const record = await this.getRecord(recordId);
    const run = await StaffPayrollRun.findById(record.runId);

    return {
      company: {
        name: 'VITAL SECURITY SERVICES PLC',
        address: 'Bole Sub-City, Addis Ababa, Ethiopia',
        department: 'Headquarters & Office Administration',
      },
      period: record.periodKey,
      status: run?.status || 'CALCULATED',
      employee: {
        id: record.employeeId,
        code: record.snapshot.employeeCode,
        fullName: record.snapshot.fullName,
        department: record.snapshot.department,
        jobPosition: record.snapshot.jobPosition,
        bankName: record.snapshot.bankName,
        accountNumber: record.snapshot.accountNumber,
        pensionEnrolled: record.snapshot.pensionEnrolled,
      },
      earnings: {
        basicSalary: record.snapshot.basic,
        responsibilityAllowance: record.snapshot.responsibilityAllowance,
        teleAllowance: record.snapshot.teleAllowance,
        taxableTransport: record.snapshot.taxableTransport,
        nonTaxableTransport: record.snapshot.nonTaxableTransport,
        overtimeAmount: record.overtimeAmount,
        grossEarnings: record.grossEarnings,
      },
      deductions: {
        employeePension: record.employeePension,
        employerPension: record.employerPension,
        incomeTax: record.incomeTax,
        otherDeductions: record.deductions,
        totalDeductions: record.totalDeductions,
      },
      netPay: record.netPay,
      bonus: record.bonus,
      finalAmountPaid: record.finalAmountPaid,
      generatedAt: new Date().toISOString(),
      watermark: `VTL-STF-${record._id.toString().slice(-8).toUpperCase()}`,
    };
  }

  private static async log(userId: string, action: string, run: IStaffPayrollRun, auditCtx?: AuditCtx, reason?: string) {
    await AuditService.log({
      userId,
      action,
      entity: 'StaffPayrollRun',
      entityId: run._id.toString(),
      newValues: {
        periodKey: run.periodKey,
        status: run.status,
        employees: run.totals.employees,
        netPay: run.totals.netPay,
        ...(reason ? { reason } : {}),
      },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
  }
}
