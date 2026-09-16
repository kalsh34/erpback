import { GuardPayrollRecord, IGuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { PayrollPeriod, IPayrollPeriod } from '../../../models/PayrollPeriod';
import { PayrollApproval } from '../../../models/PayrollApproval';
import { PayrollCalculationService } from '../finance/payrollCalculation.service';
import { PayrollJournalService } from '../../finance-accounting/payrollJournal.service';
import { JournalService } from '../../finance-accounting/journal.service';
import { ApiError } from '../../../common/ApiError';
import { PayrollRecordStatus, UserRole } from '../../../types';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class GuardPayrollService {
  static async getAll(query: { payrollPeriodId?: string; status?: string; page?: number; limit?: number }) {
    const { payrollPeriodId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (payrollPeriodId) filter.payrollPeriodId = payrollPeriodId;
    if (status) filter.status = status;

    const [records, total] = await Promise.all([
      GuardPayrollRecord.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('guardId')
        .populate('primarySiteId')
        .populate('payrollPeriodId'),
      GuardPayrollRecord.countDocuments(filter),
    ]);
    return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(id)
      .populate('guardId')
      .populate('primarySiteId')
      .populate('payrollPeriodId');
    if (!record) throw ApiError.notFound('Guard payroll record not found');
    return record;
  }

  static async generateRecords(payrollPeriodId: string, auditCtx?: { userId: string; ip?: string; ua?: string }) {
    const period = await PayrollPeriod.findById(payrollPeriodId);
    if (!period) throw ApiError.notFound('Payroll period not found');
    // Developer decision: guard payroll (like staff payroll) may only be generated
    // once the period is LOCKED. This removes the OPEN-vs-LOCKED conflict between
    // the two payroll modules.
    if (period.status !== 'LOCKED') {
      throw ApiError.badRequest(
        'Period must be LOCKED before generating guard payroll. Please lock the period first.'
      );
    }

    const records = await PayrollCalculationService.generateGuardPayrollRecords(payrollPeriodId);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'GUARD_PAYROLL_GENERATE',
        entity: 'GuardPayrollRecord',
        newValues: { payrollPeriodId, count: records.length },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.guardPayroll.generated', { payrollPeriodId, count: records.length });

    return records;
  }

  static async enterOt(
    recordId: string,
    data: { regularOtHours?: number; holidayOtHours?: number },
    userId: string,
    auditCtx?: { ip?: string; ua?: string }
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.DRAFT && record.status !== PayrollRecordStatus.RETURNED) {
      throw ApiError.badRequest('Record must be DRAFT or RETURNED');
    }

    const old = { regularOtHours: record.regularOtHours, holidayOtHours: record.holidayOtHours };
    if (data.regularOtHours !== undefined) record.regularOtHours = data.regularOtHours;
    if (data.holidayOtHours !== undefined) record.holidayOtHours = data.holidayOtHours;
    await record.save();

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_ENTER_OT',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      oldValues: old,
      newValues: data,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.otEntered', { recordId });

    return record;
  }

  static async calculate(
    recordId: string,
    auditCtx?: { userId: string; ip?: string; ua?: string }
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.DRAFT && record.status !== PayrollRecordStatus.RETURNED) {
      throw ApiError.badRequest('Record must be DRAFT or RETURNED');
    }

    const calculated = await PayrollCalculationService.calculateGuardPayroll(recordId);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'GUARD_PAYROLL_CALCULATE',
        entity: 'GuardPayrollRecord',
        entityId: recordId,
        newValues: { netPay: calculated.netPay, grossPay: calculated.grossPay },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.guardPayroll.calculated', { recordId, netPay: calculated.netPay });

    return calculated;
  }

  static async submit(recordId: string, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.CALCULATED && record.status !== PayrollRecordStatus.RETURNED) {
      throw ApiError.badRequest('Record must be CALCULATED or RETURNED');
    }

    record.status = PayrollRecordStatus.SUBMITTED;
    record.submittedBy = userId as any;
    record.submittedAt = new Date();
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'SUBMITTED',
      performedBy: userId,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_SUBMIT',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.submitted', { recordId });

    return record;
  }

  static async check(recordId: string, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.SUBMITTED) {
      throw ApiError.badRequest('Record must be SUBMITTED');
    }

    record.status = PayrollRecordStatus.CHECKED;
    record.checkedBy = userId as any;
    record.checkedAt = new Date();
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'CHECKED',
      performedBy: userId,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_CHECK',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.checked', { recordId });

    return record;
  }

  static async approve(recordId: string, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.CHECKED) {
      throw ApiError.badRequest('Record must be CHECKED');
    }

    record.status = PayrollRecordStatus.APPROVED;
    record.approvedBy = userId as any;
    record.approvedAt = new Date();
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'APPROVED',
      performedBy: userId,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_APPROVE',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.approved', { recordId });

    return record;
  }

  static async initiatePayment(recordId: string, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.APPROVED) {
      throw ApiError.badRequest('Record must be APPROVED');
    }

    record.status = PayrollRecordStatus.PAYMENT_PROCESSING;
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'PAYMENT_PROCESSING',
      performedBy: userId,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_INITIATE_PAYMENT',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });

    return record;
  }

  static async confirmPaid(
    recordId: string,
    data: { paymentMethod: string; bankReference?: string; paymentDate: Date },
    userId: string,
    auditCtx?: { ip?: string; ua?: string }
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.PAYMENT_PROCESSING) {
      throw ApiError.badRequest('Record must be PAYMENT_PROCESSING');
    }

    // Stage payment fields in memory only — nothing is persisted until the
    // journal and loan side-effects below both succeed. Standalone MongoDB has
    // no multi-document transactions, so ordering + compensation is the
    // atomicity mechanism: journal first, loan second, PAID flip last.
    record.paymentMethod = data.paymentMethod;
    record.bankReference = data.bankReference;
    record.paymentDate = data.paymentDate;
    record.paidBy = userId as any;
    record.paidAt = new Date();

    const period = await PayrollPeriod.findById(record.payrollPeriodId);
    const periodLabel = period ? `${period.monthName} ${period.year}` : 'Unknown Period';

    // 1) Journal first. Throws on imbalance/validation — the record is untouched
    // in the DB, so a failed journal can never leave a silent PAID-with-no-entry.
    const journalEntry = await PayrollJournalService.postGuardPayroll(record, periodLabel, userId, auditCtx);

    // 2) Loan ledger mutation (moved here from generation so abandoned drafts
    // never move money). Same basis as the generation snapshot: period end.
    try {
      const guardId = (record.guardId as any)?._id || record.guardId;
      await PayrollCalculationService.applyLoanRepayment(
        guardId,
        record.loanDeduction,
        period?.endDate || record.paymentDate
      );
    } catch (loanErr) {
      // Compensate: void the just-posted journal so the ledger has no orphan,
      // then surface the original failure.
      try {
        await JournalService.voidEntry(
          (journalEntry._id as any).toString(),
          'Loan repayment failed after journal posting — auto-voided to keep payment atomic',
          userId,
          auditCtx
        );
      } catch (voidErr) {
        console.error('[GuardPayroll] Failed to void journal after loan failure:', voidErr);
      }
      throw loanErr;
    }

    // 3) Only now flip to PAID and persist everything together.
    record.status = PayrollRecordStatus.PAID;
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'PAID',
      performedBy: userId,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_PAY',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      newValues: { paymentMethod: data.paymentMethod, paymentDate: data.paymentDate },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.paid', { recordId });

    return record;
  }

  static async returnForCorrection(recordId: string, userId: string, reason: string, auditCtx?: { ip?: string; ua?: string }, userRole?: string): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.CHECKED && record.status !== PayrollRecordStatus.APPROVED) {
      throw ApiError.badRequest('Record must be CHECKED or APPROVED');
    }

    // Separation of duties is enforced here, not just at the route gate:
    // Finance owns the CHECKED stage, so only Finance may return from it;
    // an APPROVED record has passed Finance, so only HEAD may return it.
    // (SUPER_ADMIN retains both as the break-glass role.)
    const allowedRoles = record.status === PayrollRecordStatus.CHECKED
      ? [UserRole.FINANCE_OFFICER, UserRole.SUPER_ADMIN]
      : [UserRole.HEAD, UserRole.SUPER_ADMIN];
    if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
      throw ApiError.forbidden(
        record.status === PayrollRecordStatus.CHECKED
          ? 'Only Finance may return a CHECKED record for correction'
          : 'Only HEAD may return an APPROVED record for correction'
      );
    }

    record.status = PayrollRecordStatus.RETURNED;
    record.returnedBy = userId as any;
    record.returnedAt = new Date();
    record.returnReason = reason;
    await record.save();

    await PayrollApproval.create({
      payrollRecordId: record._id,
      payrollType: 'GUARD',
      action: 'RETURNED',
      performedBy: userId,
      notes: reason,
    });

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_RETURN',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      newValues: { reason },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardPayroll.returned', { recordId, reason });

    return record;
  }

  static async updateHours(
    recordId: string,
    data: { normalHours?: number; otHours?: number; holidayHours?: number },
    userId: string,
    auditCtx?: { ip?: string; ua?: string }
  ): Promise<IGuardPayrollRecord> {
    const record = await GuardPayrollRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Record not found');
    if (record.status !== PayrollRecordStatus.DRAFT && record.status !== PayrollRecordStatus.RETURNED) {
      throw ApiError.badRequest('Record must be DRAFT or RETURNED to edit');
    }

    const oldHours = { normalHours: record.normalHours, otHours: record.otHours, holidayHours: record.holidayHours };
    if (data.normalHours !== undefined) record.normalHours = data.normalHours;
    if (data.otHours !== undefined) record.otHours = data.otHours;
    if (data.holidayHours !== undefined) record.holidayHours = data.holidayHours;
    await record.save();

    AuditService.log({
      userId,
      action: 'GUARD_PAYROLL_UPDATE_HOURS',
      entity: 'GuardPayrollRecord',
      entityId: recordId,
      oldValues: oldHours,
      newValues: data,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });

    return record;
  }
}
