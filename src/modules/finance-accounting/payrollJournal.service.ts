import { JournalService } from './journal.service';
import { eventBus } from '../../core/events/EventBus';

const ACCOUNTS = {
  SALARY_EXPENSE: { code: '5100', name: 'Salary Expense' },
  GUARD_PAYABLE: { code: '2100', name: 'Guard Payroll Payable' },
  STAFF_PAYABLE: { code: '2110', name: 'Staff Payroll Payable' },
  BANK: { code: '1200', name: 'Bank Account' },
  INCOME_TAX_PAYABLE: { code: '2200', name: 'Income Tax Payable' },
  PENSION_PAYABLE: { code: '2210', name: 'Pension Payable' },
  EMPLOYER_PENSION_EXPENSE: { code: '5200', name: 'Employer Pension Expense' },
  LOAN_PAYABLE: { code: '2300', name: 'Loan Repayment Payable' },
  OT_EXPENSE: { code: '5110', name: 'Overtime Expense' },
  HOLIDAY_EXPENSE: { code: '5120', name: 'Holiday Pay Expense' },
  BONUS_EXPENSE: { code: '5130', name: 'Bonus Expense' },
};

export class PayrollJournalService {
  /**
   * Double-entry rule: debits must equal credits.
   * Debits : Salary Expense (worked basic + secondary) + OT Expense + Holiday Expense
   *          + Employer Pension Expense
   * Credits: Bank (net pay) + Income Tax Payable + Employee Pension Payable
   *          + EMPLOYER Pension Payable + Loan Payable
   */
  static async postGuardPayroll(record: any, periodLabel: string, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const grossPay = Number(record.grossPay) || 0;
    const regularOtPay = Number(record.regularOtPay) || 0;
    const holidayOtPay = Number(record.holidayOtPay) || 0;
    const holidayPay = Number(record.holidayPay) || 0;
    const otTotal = Math.round((regularOtPay + holidayOtPay) * 100) / 100;
    const salaryExpense = Math.round((grossPay - otTotal - holidayPay) * 100) / 100;

    const lines: any[] = [
      {
        accountCode: ACCOUNTS.SALARY_EXPENSE.code,
        accountName: ACCOUNTS.SALARY_EXPENSE.name,
        description: `Guard salary - ${record.guardId?.firstName || ''} ${record.guardId?.lastName || ''} (${periodLabel})`,
        debit: salaryExpense,
        credit: 0,
      },
    ];

    if (otTotal > 0) {
      lines.push({
        accountCode: ACCOUNTS.OT_EXPENSE.code,
        accountName: ACCOUNTS.OT_EXPENSE.name,
        description: `Overtime pay - ${periodLabel}`,
        debit: otTotal,
        credit: 0,
      });
    }

    if (holidayPay > 0) {
      lines.push({
        accountCode: ACCOUNTS.HOLIDAY_EXPENSE.code,
        accountName: ACCOUNTS.HOLIDAY_EXPENSE.name,
        description: `Holiday pay - ${periodLabel}`,
        debit: holidayPay,
        credit: 0,
      });
    }

    if ((Number(record.employerPension) || 0) > 0) {
      lines.push({
        accountCode: ACCOUNTS.EMPLOYER_PENSION_EXPENSE.code,
        accountName: ACCOUNTS.EMPLOYER_PENSION_EXPENSE.name,
        description: `Employer pension contribution (11%) - ${periodLabel}`,
        debit: Number(record.employerPension),
        credit: 0,
      });
    }

    lines.push(
      {
        accountCode: ACCOUNTS.BANK.code,
        accountName: ACCOUNTS.BANK.name,
        description: `Bank payment - Guard payroll (${periodLabel})`,
        debit: 0,
        credit: Number(record.netPay) || 0,
      },
      {
        accountCode: ACCOUNTS.INCOME_TAX_PAYABLE.code,
        accountName: ACCOUNTS.INCOME_TAX_PAYABLE.name,
        description: `Income tax deducted - ${periodLabel}`,
        debit: 0,
        credit: Number(record.incomeTax) || 0,
      },
      {
        accountCode: ACCOUNTS.PENSION_PAYABLE.code,
        accountName: ACCOUNTS.PENSION_PAYABLE.name,
        description: `Employee pension (7%) - ${periodLabel}`,
        debit: 0,
        credit: Number(record.employeePension) || 0,
      },
      {
        accountCode: ACCOUNTS.PENSION_PAYABLE.code,
        accountName: ACCOUNTS.PENSION_PAYABLE.name,
        description: `Employer pension (11%) payable - ${periodLabel}`,
        debit: 0,
        credit: Number(record.employerPension) || 0,
      }
    );

    if ((Number(record.loanDeduction) || 0) > 0) {
      lines.push({
        accountCode: ACCOUNTS.LOAN_PAYABLE.code,
        accountName: ACCOUNTS.LOAN_PAYABLE.name,
        description: `Loan repayment - ${periodLabel}`,
        debit: 0,
        credit: Number(record.loanDeduction),
      });
    }

    const entry = await JournalService.createEntry({
      entryType: 'PAYROLL',
      description: `Guard payroll - ${record.guardId?.firstName || ''} ${record.guardId?.lastName || ''} - ${periodLabel}`,
      reference: record.paymentMethod === 'BANK_TRANSFER' ? `BANK-${record.bankReference || 'N/A'}` : `CASH-${periodLabel}`,
      referenceModel: 'GuardPayrollRecord',
      referenceId: (record._id as any).toString(),
      lines,
      payrollPeriodId: (record.payrollPeriodId as any)?._id?.toString() || (record.payrollPeriodId as any)?.toString(),
      userId,
      ip: auditCtx?.ip,
      ua: auditCtx?.ua,
    });

    eventBus.emit('finance.journal.created', { entryId: entry._id, type: 'PAYROLL', module: 'GUARD' });
    return entry;
  }

  static async postStaffPayroll(record: any, periodLabel: string, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const grossSalary = Number(record.grossSalary) || 0;
    const overtime = Number(record.overtime) || 0;
    const salaryExpense = Math.round((grossSalary - overtime) * 100) / 100;

    const lines: any[] = [
      {
        accountCode: ACCOUNTS.SALARY_EXPENSE.code,
        accountName: ACCOUNTS.SALARY_EXPENSE.name,
        description: `Staff salary - ${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''} (${periodLabel})`,
        debit: salaryExpense,
        credit: 0,
      },
    ];

    if (overtime > 0) {
      lines.push({
        accountCode: ACCOUNTS.OT_EXPENSE.code,
        accountName: ACCOUNTS.OT_EXPENSE.name,
        description: `Overtime pay - ${periodLabel}`,
        debit: overtime,
        credit: 0,
      });
    }

    if ((Number(record.employerPension) || 0) > 0) {
      lines.push({
        accountCode: ACCOUNTS.EMPLOYER_PENSION_EXPENSE.code,
        accountName: ACCOUNTS.EMPLOYER_PENSION_EXPENSE.name,
        description: `Employer pension contribution (11%) - ${periodLabel}`,
        debit: Number(record.employerPension),
        credit: 0,
      });
    }

    // Bonus is paid through net pay but sits outside gross: book it as its own
    // expense debit so the entry still balances (debits == credits).
    if ((Number(record.bonus) || 0) > 0) {
      lines.push({
        accountCode: ACCOUNTS.BONUS_EXPENSE.code,
        accountName: ACCOUNTS.BONUS_EXPENSE.name,
        description: `Bonus (post-net, untaxed) - ${periodLabel}`,
        debit: Number(record.bonus),
        credit: 0,
      });
    }

    lines.push(
      {
        accountCode: ACCOUNTS.BANK.code,
        accountName: ACCOUNTS.BANK.name,
        description: `Bank payment - Staff payroll (${periodLabel})`,
        debit: 0,
        credit: Number(record.netPay) || 0,
      },
      {
        accountCode: ACCOUNTS.INCOME_TAX_PAYABLE.code,
        accountName: ACCOUNTS.INCOME_TAX_PAYABLE.name,
        description: `Income tax deducted - ${periodLabel}`,
        debit: 0,
        credit: Number(record.incomeTax) || 0,
      },
      {
        accountCode: ACCOUNTS.PENSION_PAYABLE.code,
        accountName: ACCOUNTS.PENSION_PAYABLE.name,
        description: `Employee pension (7%) - ${periodLabel}`,
        debit: 0,
        credit: Number(record.employeePension) || 0,
      },
      {
        accountCode: ACCOUNTS.PENSION_PAYABLE.code,
        accountName: ACCOUNTS.PENSION_PAYABLE.name,
        description: `Employer pension (11%) payable - ${periodLabel}`,
        debit: 0,
        credit: Number(record.employerPension) || 0,
      }
    );

    if ((Number(record.loanDeduction) || 0) > 0) {
      lines.push({
        accountCode: ACCOUNTS.LOAN_PAYABLE.code,
        accountName: ACCOUNTS.LOAN_PAYABLE.name,
        description: `Loan repayment - ${periodLabel}`,
        debit: 0,
        credit: Number(record.loanDeduction),
      });
    }

    if ((Number(record.otherDeductions) || 0) > 0) {
      lines.push({
        accountCode: '2220',
        accountName: 'Other Deductions Payable',
        description: `Other deductions - ${periodLabel}`,
        debit: 0,
        credit: Number(record.otherDeductions),
      });
    }

    if ((Number(record.penalty) || 0) > 0) {
      lines.push({
        accountCode: '2220',
        accountName: 'Other Deductions Payable',
        description: `Penalty deduction - ${periodLabel}`,
        debit: 0,
        credit: Number(record.penalty),
      });
    }

    const entry = await JournalService.createEntry({
      entryType: 'PAYROLL',
      description: `Staff payroll - ${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''} - ${periodLabel}`,
      reference: record.paymentMethod === 'BANK_TRANSFER' ? `BANK-${record.bankReference || 'N/A'}` : `CASH-${periodLabel}`,
      referenceModel: 'StaffPayrollRecord',
      referenceId: (record._id as any).toString(),
      lines,
      payrollPeriodId: (record.payrollPeriodId as any)?._id?.toString() || (record.payrollPeriodId as any)?.toString(),
      userId,
      ip: auditCtx?.ip,
      ua: auditCtx?.ua,
    });

    eventBus.emit('finance.journal.created', { entryId: entry._id, type: 'PAYROLL', module: 'STAFF' });
    return entry;
  }
}
