import { GuardPayrollRun, IGuardPayrollRun } from '../../models/GuardPayrollRun';
import { GuardPayrollRecord } from '../../models/GuardPayrollRecord';
import { Employee } from '../../models/Employee';
import { Contract } from '../../models/Contract';
import { PrimarySiteAssignment } from '../../models/PrimarySiteAssignment';
import { User } from '../../models/User';
import { GuardMonthlyHoursService } from '../hr/guardAttendance/monthlyHours.service';
import { GuardPayrollConfigService } from './guardPayrollConfig.service';
import { SiteCompensationService } from './siteCompensation.service';
import { GuardPayrollLockService } from './guardPayrollLock.service';
import { computeGuardPayroll, round2, SiteHoursBuckets } from './guardPayrollEngine';
import { StatutoryService } from '../payrollCommon/statutory.service';
import { DeductionsService } from '../payrollCommon/deductions.service';
import { AttendanceSummaryService } from '../payrollCommon/attendanceSummary.service';
import { ApiError } from '../../common/ApiError';
import { AuditService } from '../../core/audit/AuditService';
import { EmployeeCategory, EmployeeStatus, PayrollRecordStatus } from '../../types';

interface AuditCtx { ip?: string; ua?: string }

const EDITABLE_STATUSES = [PayrollRecordStatus.DRAFT, PayrollRecordStatus.CALCULATED, PayrollRecordStatus.RETURNED];
const ZERO_HOURS: SiteHoursBuckets = { normalHours: 0, holidayHours: 0, sundayHours: 0 };

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
 * GUARD PAYROLL RUN SERVICE — the orchestrator.
 *
 * Fetch-first design: payroll never re-enters source data. It reads guards,
 * contracts, effective-dated site assignments, site compensations, the
 * canonical attendance hours feed and statutory/deduction config, then writes
 * one immutable snapshot record per guard.
 */
export class GuardPayrollRunService {
  // ───────────────────────────────────────────────────────────────────
  // Calculation
  // ───────────────────────────────────────────────────────────────────

  /**
   * Create or recalculate the run for a month. Only possible while the run is
   * DRAFT / CALCULATED / RETURNED — submitted and beyond must be RETURNED first.
   */
  static async calculate(periodKey: string, userId: string, auditCtx?: AuditCtx) {
    const { year, month, start, end } = monthWindow(periodKey);

    let run = await GuardPayrollRun.findOne({ periodKey });
    if (run && !EDITABLE_STATUSES.includes(run.status)) {
      throw ApiError.conflict(
        `Payroll for ${periodKey} is ${run.status}. RETURN it for correction before recalculating.`
      );
    }
    if (!run) {
      run = await GuardPayrollRun.create({ periodKey, status: PayrollRecordStatus.DRAFT });
    }
    const wasReturned = run.status === PayrollRecordStatus.RETURNED;

    // Wipe previous calculation for this run (records are regenerated atomically below).
    await GuardPayrollRecord.deleteMany({ runId: run._id });

    const config = await GuardPayrollConfigService.getNumbers();
    const [pensionRule, taxTable] = await Promise.all([
      StatutoryService.getPensionRuleForPeriod(start),
      StatutoryService.getTaxTableForPeriod(start),
    ]);
    const taxBrackets = taxTable?.brackets?.length ? taxTable.brackets : [];

    const guards = await Employee.find({
      category: EmployeeCategory.GUARD,
      status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.CONTRACTED] },
    }).sort({ employeeCode: 1 });

    const hoursFeed = await GuardMonthlyHoursService.getPayrollHours(year, month);
    const hoursByGuard = new Map(hoursFeed.guards.map((g) => [g.guardId, g]));

    const guardIds = guards.map((g) => g._id);
    const [assignments, contracts] = await Promise.all([
      PrimarySiteAssignment.find({
        guardId: { $in: guardIds },
        effectiveFrom: { $lte: end },
        $or: [{ effectiveTo: null }, { effectiveTo: { $exists: false } }, { effectiveTo: { $gte: start } }],
      }).populate('siteId', 'siteName siteCode status'),
      Contract.find({
        employeeId: { $in: guardIds },
        status: 'ACTIVE',
        contractStartDate: { $lte: end },
        $or: [{ contractEndDate: null }, { contractEndDate: { $exists: false } }, { contractEndDate: { $gte: start } }],
      }).sort({ contractStartDate: -1 }),
    ]);

    const assignmentsByGuard = new Map<string, any[]>();
    for (const assignment of assignments) {
      const key = assignment.guardId.toString();
      if (!assignmentsByGuard.has(key)) assignmentsByGuard.set(key, []);
      assignmentsByGuard.get(key)!.push(assignment);
    }
    const contractByGuard = new Map<string, any>();
    for (const contract of contracts) {
      const key = contract.employeeId.toString();
      if (!contractByGuard.has(key)) contractByGuard.set(key, contract);
    }

    const problems: IGuardPayrollRun['problems'] = [];
    const records: any[] = [];

    for (const guard of guards) {
      const guardKey = guard._id.toString();
      const guardName = [guard.firstName, guard.middleName, guard.lastName].filter(Boolean).join(' ');
      const guardAssignments = assignmentsByGuard.get(guardKey) || [];
      const primaries = guardAssignments.filter((a) => a.isPrimary);

      // Rule: every guard must have EXACTLY one primary site — never silently continue.
      if (primaries.length === 0) {
        problems.push({
          employeeId: guard._id,
          employeeCode: guard.employeeCode,
          guardName,
          code: 'NO_PRIMARY_SITE',
          message: `${guardName} (${guard.employeeCode}) has no primary site for ${periodKey} — assign a primary site in Operations, then recalculate.`,
        });
        continue;
      }
      if (primaries.length > 1) {
        problems.push({
          employeeId: guard._id,
          employeeCode: guard.employeeCode,
          guardName,
          code: 'MULTIPLE_PRIMARY_SITES',
          message: `${guardName} (${guard.employeeCode}) has ${primaries.length} primary sites for ${periodKey} — exactly one is required. Fix the site assignments, then recalculate.`,
        });
        continue;
      }

      const primaryAssignment = primaries[0];
      const primarySite: any = primaryAssignment.siteId;
      const primarySiteId = (primarySite?._id || primarySite).toString();

      let primaryCompensation;
      try {
        primaryCompensation = await SiteCompensationService.resolveForPeriod(primarySiteId, start, end);
      } catch (err: any) {
        problems.push({
          employeeId: guard._id,
          employeeCode: guard.employeeCode,
          guardName,
          code: 'NO_SITE_COMPENSATION',
          message: `${guardName} (${guard.employeeCode}) — primary site ${primarySite?.siteName || primarySiteId}: ${err?.message || 'no site compensation configured'}.`,
        });
        continue;
      }

      const warnings: string[] = [];
      const siteMeta = new Map<string, { siteName: string; siteCode?: string }>();
      for (const assignment of guardAssignments) {
        const site: any = assignment.siteId;
        siteMeta.set((site?._id || site).toString(), { siteName: site?.siteName || '', siteCode: site?.siteCode });
      }
      const guardHours = hoursByGuard.get(guardKey);
      const hoursForSite = (siteId: string): SiteHoursBuckets => {
        const site = guardHours?.sites.find((s) => s.siteId === siteId);
        return site ? { normalHours: site.normalHours, holidayHours: site.holidayHours, sundayHours: site.sundayHours } : { ...ZERO_HOURS };
      };

      const additionalSites: { siteId: string; compensationAmount: number; hours: SiteHoursBuckets }[] = [];
      const seenAdditional = new Set<string>();
      for (const assignment of guardAssignments.filter((a) => !a.isPrimary)) {
        const site: any = assignment.siteId;
        const siteId = (site?._id || site).toString();
        if (seenAdditional.has(siteId)) continue;
        seenAdditional.add(siteId);
        try {
          const compensation = await SiteCompensationService.resolveForPeriod(siteId, start, end);
          additionalSites.push({
            siteId,
            compensationAmount: compensation.compensationAmount,
            hours: hoursForSite(siteId),
          });
        } catch (err: any) {
          const hours = hoursForSite(siteId);
          const total = round2(hours.normalHours + hours.holidayHours + hours.sundayHours);
          warnings.push(
            `Additional site ${site?.siteName || siteId} has no compensation configured for this period${
              total > 0 ? ` — ${total}h recorded there were NOT paid` : ''
            }.`
          );
        }
      }

      const contract = contractByGuard.get(guardKey);
      if (!contract) {
        warnings.push('No active contract found for this period — pension was not applied.');
      }
      if (!pensionRule) warnings.push('No pension rule is configured for this period — pension was not applied.');
      if (!taxBrackets.length) warnings.push('No income tax table is configured for this period — income tax was not applied.');

      const deductions = await DeductionsService.listForPeriod(guardKey, periodKey);

      const result = computeGuardPayroll({
        primary: { siteId: primarySiteId, compensationAmount: primaryCompensation.compensationAmount, hours: hoursForSite(primarySiteId) },
        additionalSites,
        config,
        pensionEnrolled: contract?.pensionEnrolled ?? false,
        pension: pensionRule
          ? {
              employeePercent: pensionRule.employeePercent,
              employerPercent: pensionRule.employerPercent,
              minPensionableSalary: pensionRule.minPensionableSalary,
              maxPensionableSalary: pensionRule.maxPensionableSalary,
            }
          : null,
        taxBrackets,
        deductions,
      });

      records.push(
        await GuardPayrollRecord.create({
          runId: run._id,
          periodKey,
          employeeId: guard._id,
          snapshot: {
            employeeCode: guard.employeeCode,
            fullName: guardName,
            bankName: guard.bankName,
            accountNumber: guard.accountNumber,
            pensionEnrolled: contract?.pensionEnrolled ?? false,
            contractType: contract?.contractType,
            contractWage: contract?.wage,
          },
          primarySite: {
            siteId: primarySiteId,
            siteName: primarySite?.siteName || '',
            siteCode: primarySite?.siteCode,
            ...result.primary,
            // Config constants actually used for this calculation (rule 12:
            // finalized records must preserve every input, incl. the divisor).
            transportPercent: config.transportPercent,
            standardMonthlyHours: config.standardMonthlyHours,
            sundayStructuralHours: config.sundayStructuralHours,
            basicHourlyDivisor: config.basicHourlyDivisor,
          },
          additionalSites: result.additionalSites.map((site) => ({
            siteId: site.siteId,
            siteName: siteMeta.get(site.siteId)?.siteName || '',
            siteCode: siteMeta.get(site.siteId)?.siteCode,
            compensationAmount: site.compensationAmount,
            otRate: site.otRate,
            normalHours: site.normalHours,
            holidayHours: site.holidayHours,
            sundayHours: site.sundayHours,
            totalHours: site.totalHours,
            siteEarnings: site.siteEarnings,
          })),
          grossEarnings: result.grossEarnings,
          pensionBase: result.pensionBase,
          taxableEarnings: result.taxableEarnings,
          employeePension: result.employeePension,
          employerPension: result.employerPension,
          incomeTax: result.incomeTax,
          deductions: result.deductions.map((d) => ({ ...d, deductionId: d.deductionId })),
          totalDeductions: result.totalDeductions,
          netPay: result.netPay,
          warnings,
        })
      );
    }

    const totals = {
      guards: records.length,
      grossEarnings: round2(records.reduce((s, r) => s + r.grossEarnings, 0)),
      employeePension: round2(records.reduce((s, r) => s + r.employeePension, 0)),
      employerPension: round2(records.reduce((s, r) => s + r.employerPension, 0)),
      incomeTax: round2(records.reduce((s, r) => s + r.incomeTax, 0)),
      totalDeductions: round2(records.reduce((s, r) => s + r.totalDeductions, 0)),
      netPay: round2(records.reduce((s, r) => s + r.netPay, 0)),
    };

    run.status = PayrollRecordStatus.CALCULATED;
    run.calculatedBy = userId as any;
    run.calculatedAt = new Date();
    run.problems = problems;
    run.totals = totals;
    await run.save();

    await AuditService.log({
      userId,
      action: wasReturned ? 'GUARD_PAYROLL_RECALCULATE' : 'GUARD_PAYROLL_CALCULATE',
      entity: 'GuardPayrollRun',
      entityId: run._id.toString(),
      newValues: { periodKey, status: run.status, guards: totals.guards, netPay: totals.netPay, problems: problems.length },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });

    return this.getRun(run._id.toString());
  }

  // ───────────────────────────────────────────────────────────────────
  // Reads
  // ───────────────────────────────────────────────────────────────────

  static async listRuns(filters: { periodKey?: string; status?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filters.periodKey) query.periodKey = filters.periodKey;
    if (filters.status) query.status = filters.status;
    return GuardPayrollRun.find(query).sort({ periodKey: -1 }).limit(120);
  }

  static async getRun(runId: string) {
    const run = await GuardPayrollRun.findById(runId);
    if (!run) throw ApiError.notFound('Guard payroll run not found');
    const records = await GuardPayrollRecord.find({ runId: run._id })
      .populate('primarySite.siteId', 'siteName siteCode')
      .sort({ 'snapshot.employeeCode': 1 });

    // Attendance summary: canonical hours per guard (same feed payroll uses)
    // so Finance sees shortfalls next to the pay lines.
    const attendance = await AttendanceSummaryService.forRun(
      'GUARD',
      run.periodKey,
      records.map((r) => r.employeeId.toString())
    );

    return { run, records, attendance };
  }

  static async getRecord(recordId: string) {
    const record = await GuardPayrollRecord.findById(recordId)
      .populate('primarySite.siteId', 'siteName siteCode')
      .populate('additionalSites.siteId', 'siteName siteCode');
    if (!record) throw ApiError.notFound('Guard payroll record not found');
    return record;
  }

  /** Guard self-service: the signed-in user's own payroll history. */
  static async myPayroll(userId: string, periodKey?: string) {
    const user = await User.findById(userId);
    if (!user?.employeeId) throw ApiError.badRequest('Your account is not linked to an employee record');
    const query: Record<string, unknown> = { employeeId: user.employeeId };
    if (periodKey) query.periodKey = periodKey;
    return GuardPayrollRecord.find(query).sort({ periodKey: -1 }).limit(36);
  }

  /** Attendance lock state for the UI (Operations/HR attendance pages). */
  static async getAttendanceLock(periodKey: string) {
    monthWindow(periodKey);
    return GuardPayrollLockService.getLockInfo(periodKey);
  }

  // ───────────────────────────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────────────────────────

  private static async loadRun(runId: string): Promise<IGuardPayrollRun> {
    const run = await GuardPayrollRun.findById(runId);
    if (!run) throw ApiError.notFound('Guard payroll run not found');
    return run;
  }

  private static assertStatus(run: IGuardPayrollRun, allowed: PayrollRecordStatus[], action: string) {
    if (!allowed.includes(run.status)) {
      throw ApiError.conflict(`Cannot ${action}: payroll is ${run.status} (expected ${allowed.join(' or ')}).`);
    }
  }

  /** CALCULATED → SUBMITTED. Locks attendance for the month. */
  static async submit(runId: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    this.assertStatus(run, [PayrollRecordStatus.CALCULATED], 'submit');
    if (run.problems.length > 0) {
      throw ApiError.badRequest(
        `Resolve ${run.problems.length} payroll problem(s) before submitting (e.g. guards without a primary site).`
      );
    }
    run.status = PayrollRecordStatus.SUBMITTED;
    run.submittedBy = userId as any;
    run.submittedAt = new Date();
    await run.save();
    await this.log(userId, 'GUARD_PAYROLL_SUBMIT', run, auditCtx);
    return this.getRun(runId);
  }

  /** SUBMITTED → CHECKED. */
  static async check(runId: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    this.assertStatus(run, [PayrollRecordStatus.SUBMITTED], 'check');
    run.status = PayrollRecordStatus.CHECKED;
    run.checkedBy = userId as any;
    run.checkedAt = new Date();
    await run.save();
    await this.log(userId, 'GUARD_PAYROLL_CHECK', run, auditCtx);
    return this.getRun(runId);
  }

  /** CHECKED → APPROVED. Settles loan/advance balances for the deductions taken. */
  static async approve(runId: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    this.assertStatus(run, [PayrollRecordStatus.CHECKED], 'approve');
    run.status = PayrollRecordStatus.APPROVED;
    run.approvedBy = userId as any;
    run.approvedAt = new Date();
    await run.save();

    const records = await GuardPayrollRecord.find({ runId: run._id });
    await DeductionsService.settleRun(records as any);

    await this.log(userId, 'GUARD_PAYROLL_APPROVE', run, auditCtx);
    return this.getRun(runId);
  }

  /** SUBMITTED / CHECKED / APPROVED → RETURNED. Unlocks attendance for correction. */
  static async returnForCorrection(runId: string, reason: string, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    if (!reason || !reason.trim()) throw ApiError.badRequest('A reason is required to return payroll for correction');
    this.assertStatus(
      run,
      [PayrollRecordStatus.SUBMITTED, PayrollRecordStatus.CHECKED, PayrollRecordStatus.APPROVED],
      'return'
    );
    run.status = PayrollRecordStatus.RETURNED;
    run.returnHistory.push({ reason: reason.trim(), returnedBy: userId as any, returnedAt: new Date() });
    await run.save();
    await this.log(userId, 'GUARD_PAYROLL_RETURN', run, auditCtx, reason.trim());
    return this.getRun(runId);
  }

  /** APPROVED → PAID. Final — the run is never re-opened after payment. */
  static async markPaid(runId: string, paymentRef: string | undefined, userId: string, auditCtx?: AuditCtx) {
    const run = await this.loadRun(runId);
    this.assertStatus(run, [PayrollRecordStatus.APPROVED], 'mark paid');
    run.status = PayrollRecordStatus.PAID;
    run.paidBy = userId as any;
    run.paidAt = new Date();
    if (paymentRef) run.paymentRef = paymentRef;
    await run.save();
    await this.log(userId, 'GUARD_PAYROLL_PAY', run, auditCtx);
    return this.getRun(runId);
  }

  private static async log(userId: string, action: string, run: IGuardPayrollRun, auditCtx?: AuditCtx, reason?: string) {
    await AuditService.log({
      userId,
      action,
      entity: 'GuardPayrollRun',
      entityId: run._id.toString(),
      newValues: { periodKey: run.periodKey, status: run.status, guards: run.totals.guards, netPay: run.totals.netPay },
      reason,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
  }
}
