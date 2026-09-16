import { TaxBracket, ITaxBracket } from '../../../models/TaxBracket';
import { PensionRule, IPensionRule } from '../../../models/PensionRule';
import { PayrollRate, IPayrollRate } from '../../../models/PayrollRate';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { AttendanceRecord } from '../../../models/AttendanceRecord';
import { SecondaryShiftEntry } from '../../../models/SecondaryShiftEntry';
import { Loan } from '../../../models/Loan';
import { GuardPayrollRecord, IGuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { StaffPayrollRecord, IStaffPayrollRecord } from '../../../models/StaffPayrollRecord';
import { PayrollFormulaVersion, IPayrollFormulaVersion } from '../../../models/PayrollFormulaVersion';
import { SalaryStructure, ISalaryStructure } from '../../../models/SalaryStructure';
import { ApiError } from '../../../common/ApiError';
import { PensionTaxBase, PayrollRecordStatus, LoanStatus } from '../../../types';
import { config } from '../../../config/env';

const GUARD_MONTHLY_HOURS = 720;

/**
 * Guard pension base (developer decision: pension on the salary actually earned).
 * GROSS_PAY base -> full gross pay; NORMAL_SALARY_ONLY (default) -> the worked basic salary.
 */
async function pensionBaseForGuard(grossPay: number, workedSalary: number, asOf: Date = new Date()): Promise<number> {
  const rule = await PensionRule.findOne({
    isCurrent: true,
    effectiveFrom: { $lte: asOf },
    $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: asOf } }],
  }).sort({ effectiveFrom: -1 });
  if (!rule) return workedSalary;
  return rule.pensionTaxBase === PensionTaxBase.GROSS_PAY ? grossPay : workedSalary;
}

export class PayrollCalculationService {
  static async calculateIncomeTax(taxableSalary: number, effectiveDate: Date = new Date()): Promise<number> {
    const bracket = await TaxBracket.findOne({
      isCurrent: true,
      effectiveFrom: { $lte: effectiveDate },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: effectiveDate } }],
    }).sort({ effectiveFrom: -1 });
    if (!bracket) throw ApiError.internal('No active tax bracket found');

    for (const b of bracket.brackets) {
      const max = b.max ?? Infinity;
      if (taxableSalary >= b.min && taxableSalary <= max) {
        return Math.max(0, (taxableSalary * b.rate) - b.deduction);
      }
    }
    return 0;
  }

  static async calculatePension(baseAmount: number, effectiveDate: Date = new Date()) {
    const rule = await PensionRule.findOne({
      isCurrent: true,
      effectiveFrom: { $lte: effectiveDate },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: effectiveDate } }],
    }).sort({ effectiveFrom: -1 });
    if (!rule) throw ApiError.internal('No active pension rule found');
    return {
      employeePension: Math.round(baseAmount * rule.employeeRate * 100) / 100,
      employerPension: Math.round(baseAmount * rule.employerRate * 100) / 100,
      pensionTaxBase: rule.pensionTaxBase || 'NORMAL_SALARY_ONLY',
    };
  }

  static async getCurrentFormula(asOf: Date = new Date()): Promise<IPayrollFormulaVersion> {
    const formula = await PayrollFormulaVersion.findOne({
      isCurrent: true,
      effectiveFrom: { $lte: asOf },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: asOf } }],
    }).sort({ effectiveFrom: -1 });
    if (!formula) throw ApiError.internal('No active payroll formula version found. Create one under Admin > Payroll Config.');
    return formula;
  }

  static async getActiveSalaryStructure(employeeType: 'GUARD' | 'STAFF', asOf: Date = new Date()): Promise<ISalaryStructure | null> {
    return SalaryStructure.findOne({
      employeeType,
      isCurrent: true,
      effectiveFrom: { $lte: asOf },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: asOf } }],
    }).sort({ effectiveFrom: -1 });
  }

  static getComponentValue(record: any, code: string): number {
    const fieldMap: Record<string, string> = {
      BASIC: 'basicSalary',
      RESPONSIBILITY_ALLOWANCE: 'responsibilityAllowance',
      TELE_ALLOWANCE: 'teleAllowance',
      NON_TAXABLE_ALLOWANCE: 'nonTaxableTransport',
      TAXABLE_TRANSPORT: 'taxableTransport',
      OT: 'overtime',
      BONUS: 'bonus',
      PENALTY: 'penalty',
      LOAN: 'loanDeduction',
      OTHER_DEDUCTIONS: 'otherDeductions',
    };
    const field = fieldMap[code];
    if (field && record[field] !== undefined) return record[field] as number;
    return 0;
  }

  /**
   * Resolve the effective earning rate for a guard component.
   * Priority: Contract.wage (monthly, divided by standard hours)
   *           → PrimarySiteAssignment.hourlyRate (already an HOURLY rate, used directly)
   *           → Structure BASIC defaultRate (monthly, divided by standard hours)
   *           → PayrollRate fallback (absolute hourly rates).
   */
  static async resolveGuardRates(guardId: any, assignment: any, asOf: Date = new Date()): Promise<{
    normalRate: number;
    otRate: number;
    holidayRate: number;
    holidayOtRate: number;
    standardMonthlyHours: number;
  }> {
    const { Contract } = await import('../../../models/Contract');
    const activeContract = await Contract.findOne({ employeeId: guardId, status: 'ACTIVE' });

    let normalRate = 0;
    let otRate = 0;
    let holidayRate = 0;
    let holidayOtRate = 0;
    let otMultiplier = 1.5;
    let holidayMultiplier = 2.0;
    let holidayOtMultiplier = 2.5;

    const structure = await this.getActiveSalaryStructure('GUARD', asOf);
    if (structure) {
      otMultiplier = structure.otMultiplier || 1.5;
      holidayMultiplier = structure.holidayMultiplier || 2.0;
      holidayOtMultiplier = structure.holidayOtMultiplier || 2.5;
    }

    // 1) Contract monthly wage
    if (activeContract && activeContract.wage > 0) {
      normalRate = Math.round((activeContract.wage / GUARD_MONTHLY_HOURS) * 100) / 100;
    }

    // 2) Per-site assignment hourly rate (must affect payroll)
    if (normalRate === 0 && assignment && typeof assignment.hourlyRate === 'number' && assignment.hourlyRate > 0) {
      normalRate = Math.round(assignment.hourlyRate * 100) / 100;
    }

    // 3) Salary structure default monthly BASIC
    if (normalRate === 0 && structure) {
      const basicEarning = structure.earnings.find((e) => e.componentCode === 'BASIC');
      if (basicEarning && basicEarning.defaultRate > 0) {
        normalRate = Math.round((basicEarning.defaultRate / GUARD_MONTHLY_HOURS) * 100) / 100;
      }
    }

    // 4) PayrollRate fallback (absolute hourly rates for a period)
    if (normalRate === 0) {
      const fallback = await PayrollRate.findOne({}).sort({ createdAt: -1 });
      if (fallback) {
        normalRate = fallback.normalRate;
        otRate = fallback.otRate;
        holidayRate = fallback.holidayRate;
        holidayOtRate = Math.round((fallback.normalRate * holidayOtMultiplier) * 100) / 100;
        return { normalRate, otRate, holidayRate, holidayOtRate, standardMonthlyHours: GUARD_MONTHLY_HOURS };
      }
    }

    otRate = Math.round(normalRate * otMultiplier * 100) / 100;
    holidayRate = Math.round(normalRate * holidayMultiplier * 100) / 100;
    holidayOtRate = Math.round(normalRate * holidayOtMultiplier * 100) / 100;

    return { normalRate, otRate, holidayRate, holidayOtRate, standardMonthlyHours: GUARD_MONTHLY_HOURS };
  }

  static async calculateGuardPayroll(
    recordId: string,
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId)
      .populate('guardId')
      .populate('primarySiteId');
    if (!record) throw ApiError.notFound('Guard payroll record not found');

    // Resolve time-sensitive config against the payroll period, not wall-clock time,
    // so recalculating an old period after a rule change does not reprice history.
    const { PayrollPeriod: GuardCalcPeriod } = await import('../../../models/PayrollPeriod');
    const guardPeriodId = (record.payrollPeriodId as any)?._id || record.payrollPeriodId;
    const guardPeriod = await GuardCalcPeriod.findById(guardPeriodId);
    const guardAsOf = guardPeriod?.endDate || new Date();

    const normalSalary = record.standardMonthlyHours * record.normalRate;
    const workedSalary = record.normalHours * record.normalRate;
    const regularOtPay = record.regularOtHours * record.otRate;
    // Holiday OT uses the resolved (configurable) holiday-OT rate from the salary structure
    const holidayOtRate = record.holidayOtRate && record.holidayOtRate > 0
      ? record.holidayOtRate
      : Math.round((record.normalRate * 2.5) * 100) / 100;
    const holidayOtPay = record.holidayOtHours * holidayOtRate;
    const holidayPay = record.holidayHours * record.holidayRate;
    const grossPay = workedSalary + regularOtPay + holidayOtPay + holidayPay + record.secondaryShiftPay;

    // Pension base (per developer decision): the salary actually earned.
    // GROSS_PAY base includes OT/holiday pay; NORMAL_SALARY_ONLY uses the worked basic salary only.
    const pension = await this.calculatePension(
      await pensionBaseForGuard(grossPay, workedSalary, guardAsOf),
      guardAsOf
    );
    const incomeTax = await this.calculateIncomeTax(grossPay, guardAsOf);

    const baseComponent = pension.pensionTaxBase === PensionTaxBase.GROSS_PAY
      ? grossPay
      : workedSalary;

    record.normalSalary = Math.round(normalSalary * 100) / 100;
    record.workedSalary = Math.round(workedSalary * 100) / 100;
    record.regularOtPay = Math.round(regularOtPay * 100) / 100;
    record.holidayOtPay = Math.round(holidayOtPay * 100) / 100;
    record.holidayPay = Math.round(holidayPay * 100) / 100;
    record.grossPay = Math.round(grossPay * 100) / 100;
    record.baseComponent = Math.round(baseComponent * 100) / 100;
    record.employeePension = pension.employeePension;
    record.employerPension = pension.employerPension;
    record.incomeTax = Math.round(incomeTax * 100) / 100;
    record.totalDeductions = Math.round((incomeTax + pension.employeePension + record.loanDeduction) * 100) / 100;
    record.netPay = Math.round((grossPay - record.totalDeductions) * 100) / 100;
    record.status = PayrollRecordStatus.CALCULATED;
    record.calculatedAt = new Date();
    await record.save();

    return record;
  }

  static async calculateStaffPayroll(recordId: string): Promise<IStaffPayrollRecord> {
    const record = await StaffPayrollRecord.findById(recordId)
      .populate('employeeId');
    if (!record) throw ApiError.notFound('Staff payroll record not found');

    // Resolve time-sensitive config against the payroll period, not wall-clock time.
    const { PayrollPeriod: StaffCalcPeriod } = await import('../../../models/PayrollPeriod');
    const staffPeriodId = (record.payrollPeriodId as any)?._id || record.payrollPeriodId;
    const staffPeriod = staffPeriodId ? await StaffCalcPeriod.findById(staffPeriodId) : null;
    const staffAsOf = staffPeriod?.endDate || new Date();

    const { Contract } = await import('../../../models/Contract');
    const activeContract = await Contract.findOne({
      employeeId: (record.employeeId as any)._id || record.employeeId,
      status: 'ACTIVE',
    });
    const pensionEnrolled = activeContract?.pensionEnrolled !== false;

    // --- Compute OT pay FIRST so overtime is included in gross/taxable/net ---
    // "Don't wipe it" rule: if HR entered a manual overtime amount (no OT hours), keep it.
    const manualOvertime = record.regularOtHours === 0 && record.holidayOtHours === 0 && record.overtime > 0;

    const basicSalary = this.getComponentValue(record, 'BASIC');
    const hourlyRate = basicSalary / 192;
    let otMultiplier = 1.5;
    let holidayOtMultiplier = 2.5;
    if (activeContract?.salaryStructureId) {
      const otStructure = await SalaryStructure.findById(activeContract.salaryStructureId);
      if (otStructure) {
        otMultiplier = otStructure.otMultiplier || 1.5;
        holidayOtMultiplier = otStructure.holidayOtMultiplier || 2.5;
      }
    }

    if (!manualOvertime) {
      const regularOtPay = Math.round((record.regularOtHours * hourlyRate * otMultiplier) * 100) / 100;
      const holidayOtPay = Math.round((record.holidayOtHours * hourlyRate * holidayOtMultiplier) * 100) / 100;
      record.regularOtPay = regularOtPay;
      record.holidayOtPay = holidayOtPay;
      record.overtime = Math.round((regularOtPay + holidayOtPay) * 100) / 100;
    }

    let grossSalary = 0;
    let taxableSalary = 0;
    let pensionBase = 0;
    let deductionCodes: string[] = [];
    let otCountedInGross = false;

    if (activeContract?.salaryStructureId) {
      const structure = await SalaryStructure.findById(activeContract.salaryStructureId);
      if (structure) {
        for (const earning of structure.earnings) {
          // BONUS lives outside the formula (post-net, untaxed, unpensioned) —
          // it must never enter gross or taxable even if a structure lists it.
          if (earning.componentCode === 'BONUS') continue;
          const value = this.getComponentValue(record, earning.componentCode);
          grossSalary += value;
          if (earning.taxable) taxableSalary += value;
          if (earning.componentCode === 'OT') otCountedInGross = true;
        }

        const basicEarning = structure.earnings.find((e) => e.componentCode === 'BASIC');
        if (basicEarning) {
          pensionBase = this.getComponentValue(record, 'BASIC');
        }

        deductionCodes = structure.deductions
          .filter((d) => d.enabled)
          .map((d) => d.componentCode);
      }
    }

    // Make sure overtime is part of gross/taxable even when the structure has no OT component
    if (!otCountedInGross && record.overtime > 0) {
      grossSalary += record.overtime;
      taxableSalary += record.overtime;
    }

    if (grossSalary === 0) {
      const formula = await this.getCurrentFormula(staffAsOf);

      for (const code of formula.grossComponentCodes) {
        if (code === 'BONUS') continue;
        grossSalary += this.getComponentValue(record, code);
        if (code === 'OT') otCountedInGross = true;
      }
      for (const code of formula.taxableComponentCodes) {
        if (code === 'BONUS') continue;
        taxableSalary += this.getComponentValue(record, code);
      }
      for (const code of formula.pensionBaseComponentCodes) {
        pensionBase += this.getComponentValue(record, code);
      }
      if (!otCountedInGross && record.overtime > 0) {
        grossSalary += record.overtime;
        taxableSalary += record.overtime;
      }
      deductionCodes = formula.deductionComponentCodes;
      record.formulaVersionId = formula._id;
    }

    const pension = pensionEnrolled
      ? await this.calculatePension(pensionBase, staffAsOf)
      : { employeePension: 0, employerPension: 0 };
    const incomeTax = await this.calculateIncomeTax(taxableSalary, staffAsOf);

    let totalDeductions = incomeTax + pension.employeePension;
    for (const code of deductionCodes) {
      if (code === 'INCOME_TAX' || code === 'EMPLOYEE_PENSION') continue;
      totalDeductions += this.getComponentValue(record, code);
    }

    // Bonus is added AFTER net pay, outside the formula: untaxed, unpensioned,
    // never in gross or taxable. Gross/tax/taxable/pension are identical with
    // or without a bonus; only net pay differs, by exactly the bonus amount.
    const bonus = Number(record.bonus) || 0;
    const netPay = grossSalary - totalDeductions + bonus;

    record.grossSalary = Math.round(grossSalary * 100) / 100;
    record.taxableSalary = Math.round(taxableSalary * 100) / 100;
    record.employeePension = pension.employeePension;
    record.employerPension = pension.employerPension;
    record.incomeTax = Math.round(incomeTax * 100) / 100;
    record.totalDeductions = Math.round(totalDeductions * 100) / 100;
    record.netPay = Math.round(netPay * 100) / 100;
    record.status = PayrollRecordStatus.CALCULATED;
    record.calculatedAt = new Date();
    await record.save();

    return record;
  }

  /**
   * Total loan deduction for an employee as of a date.
   * Respects: loan status ACTIVE, startDate, optional endDate, and remaining balance
   * (never deducts more than what is still owed).
   */
  static async getActiveLoanDeduction(employeeId: any, asOf: Date): Promise<number> {
    const loans = await Loan.find({
      employeeId,
      status: 'ACTIVE',
      startDate: { $lte: asOf },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: asOf } },
      ],
    });
    let total = 0;
    loans.forEach((l) => {
      const balance = typeof l.balance === 'number' ? l.balance : l.monthlyDeduction;
      total += Math.min(l.monthlyDeduction, Math.max(0, balance));
    });
    return Math.round(total * 100) / 100;
  }

  /**
   * Apply a loan repayment across the employee's active loans (oldest first):
   * increments paidAmount, decrements balance, and marks loans PAID_OFF when settled.
   */
  static async applyLoanRepayment(employeeId: any, amount: number, asOf: Date): Promise<void> {
    if (!amount || amount <= 0) return;
    const loans = await Loan.find({
      employeeId,
      status: 'ACTIVE',
      startDate: { $lte: asOf },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: asOf } },
      ],
    }).sort({ startDate: 1 });

    let remaining = amount;
    for (const loan of loans) {
      if (remaining <= 0) break;
      const balance = typeof loan.balance === 'number' ? loan.balance : loan.monthlyDeduction;
      const applied = Math.min(remaining, Math.max(0, balance));
      if (applied <= 0) continue;
      loan.paidAmount = Math.round(((loan.paidAmount || 0) + applied) * 100) / 100;
      loan.balance = Math.round((balance - applied) * 100) / 100;
      if (loan.balance <= 0) {
        loan.balance = 0;
        loan.status = LoanStatus.PAID_OFF;
      }
      await loan.save();
      remaining = Math.round((remaining - applied) * 100) / 100;
    }
  }

  static async generateGuardPayrollRecords(payrollPeriodId: string): Promise<IGuardPayrollRecord[]> {
    const { Employee } = await import('../../../models/Employee');
    const period = await (await import('../../../models/PayrollPeriod')).PayrollPeriod.findById(payrollPeriodId);
    if (!period) throw ApiError.notFound('Payroll period not found');

    // Generate for ALL active guards (developer decision: every guard gets a payroll
    // record, even without a current site assignment — Finance can override those).
    const guards = await Employee.find({
      category: 'GUARD',
      status: { $in: ['ACTIVE', 'CONTRACTED'] },
    });

    const assignments = await PrimarySiteAssignment.find({ isCurrent: true });
    const assignmentByGuard = new Map<string, any>();
    assignments.forEach((a) => {
      assignmentByGuard.set(a.guardId.toString(), a);
    });

    const records: IGuardPayrollRecord[] = [];

    for (const guard of guards) {
      const existing = await GuardPayrollRecord.findOne({
        payrollPeriodId,
        guardId: guard._id,
      });
      if (existing) continue;

      const assignment = assignmentByGuard.get((guard._id as any).toString());

      const attendance = await AttendanceRecord.find({
        guardId: guard._id,
        date: { $gte: period.startDate, $lte: period.endDate },
      });

      let normalHours = 0;
      let holidayHours = 0;
      attendance.forEach((a) => {
        if (a.isHoliday) holidayHours += a.totalHours;
        else normalHours += a.totalHours;
      });

      const secondaryShifts = await SecondaryShiftEntry.find({
        guardId: guard._id,
        payrollPeriodId,
      });
      let secondaryShiftPay = 0;
      secondaryShifts.forEach((s) => { secondaryShiftPay += s.totalPay; });

      const loanDeduction = await this.getActiveLoanDeduction(guard._id, period.endDate || new Date());

      const rates = await this.resolveGuardRates(guard._id, assignment, period.endDate || new Date());

      const record = await GuardPayrollRecord.create({
        payrollPeriodId,
        guardId: guard._id,
        primarySiteId: assignment ? assignment.siteId : null,
        standardMonthlyHours: rates.standardMonthlyHours,
        normalHours,
        otHours: 0,
        holidayHours,
        secondaryShiftPay,
        normalRate: rates.normalRate,
        otRate: rates.otRate,
        holidayRate: rates.holidayRate,
        holidayOtRate: rates.holidayOtRate,
        loanDeduction,
        status: PayrollRecordStatus.DRAFT,
      });

      // NOTE: the loan deduction above is only a snapshot for review. The actual
      // Loan.balance / paidAmount mutation happens in confirmPaid (see
      // GuardPayrollService.confirmPaid), so abandoned drafts never move money.
      records.push(record);
    }

    return records;
  }

  static async generateStaffPayrollRecords(payrollPeriodId: string): Promise<{ records: IStaffPayrollRecord[]; skipped: { employeeId: string; firstName: string; lastName: string; employeeCode: string; reason: string }[] }> {
    const { Employee } = await import('../../../models/Employee');
    const { Loan } = await import('../../../models/Loan');
    const { Contract } = await import('../../../models/Contract');
    const { StaffAttendance } = await import('../../../models/StaffAttendance');
    const { PayrollPeriod } = await import('../../../models/PayrollPeriod');

    const period = await PayrollPeriod.findById(payrollPeriodId);
    if (!period) throw ApiError.notFound('Payroll period not found');
    if (period.status !== 'LOCKED') {
      throw ApiError.badRequest(
        'Staff attendance for this period has not been locked yet. Please ask HR to lock attendance before generating payroll.'
      );
    }

    const staff = await Employee.find({ category: 'OFFICE_STAFF', status: { $in: ['ACTIVE', 'CONTRACTED'] } });
    const records: IStaffPayrollRecord[] = [];
    const skipped: { employeeId: string; firstName: string; lastName: string; employeeCode: string; reason: string }[] = [];

    for (const employee of staff) {
      const existing = await StaffPayrollRecord.findOne({ payrollPeriodId, employeeId: employee._id });
      if (existing) continue;

      const periodEnd = period.endDate || new Date();
      const activeContract = await Contract.findOne({
        employeeId: employee._id,
        status: 'ACTIVE',
        contractStartDate: { $lte: periodEnd },
        $or: [
          { contractEndDate: { $exists: false } },
          { contractEndDate: null },
          { contractEndDate: { $gte: periodEnd } },
        ],
      });

      if (!activeContract) {
        skipped.push({
          employeeId: (employee._id as any).toString(),
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
          reason: 'No active contract',
        });
        continue;
      }

      const baseSalary = activeContract.wage;
      const responsibilityAllowance = activeContract.responsibilityAllowance || 0;
      const teleAllowance = activeContract.teleAllowance || 0;
      const taxableTransport = activeContract.taxableTransport || 0;
      const nonTaxableTransport = activeContract.nonTaxableAllowance || 0;
      const bonus = 0;

      const attendanceRecords = await StaffAttendance.find({
        employeeId: employee._id,
        payrollPeriodId: payrollPeriodId,
      });

      let attendanceDataMissing = false;
      let deductibleDays = 0;

      if (attendanceRecords.length === 0) {
        attendanceDataMissing = true;
      } else {
        const counts: Record<string, number> = {
          ABSENT: 0, UNPAID_LEAVE: 0, HALF_DAY: 0,
        };
        attendanceRecords.forEach((r) => {
          if (counts[r.status] !== undefined) {
            counts[r.status]++;
          }
        });
        deductibleDays = counts.ABSENT + counts.UNPAID_LEAVE + (counts.HALF_DAY * 0.5);
      }

      const dailyRate = baseSalary / 22;
      const attendanceDeduction = deductibleDays * dailyRate;
      const basicSalary = Math.round((baseSalary - attendanceDeduction) * 100) / 100;

      const loanDeduction = await this.getActiveLoanDeduction(employee._id, period.endDate || new Date());

      const record = await StaffPayrollRecord.create({
        payrollPeriodId,
        employeeId: employee._id,
        basicSalary,
        responsibilityAllowance,
        teleAllowance,
        taxableTransport,
        nonTaxableTransport,
        overtime: 0,
        bonus,
        loanDeduction,
        attendanceDataMissing,
        status: PayrollRecordStatus.DRAFT,
      });

      // NOTE: the loan deduction above is only a snapshot for review. The actual
      // Loan.balance / paidAmount mutation happens in confirmPaid (see
      // StaffPayrollService.confirmPaid), so abandoned drafts never move money.
      records.push(record);
    }

    return { records, skipped };
  }
}
