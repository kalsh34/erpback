"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollRunService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const GuardPayrollRun_1 = require("../../models/GuardPayrollRun");
const GuardPayrollRecord_1 = require("../../models/GuardPayrollRecord");
const Employee_1 = require("../../models/Employee");
const Contract_1 = require("../../models/Contract");
const PrimarySiteAssignment_1 = require("../../models/PrimarySiteAssignment");
const User_1 = require("../../models/User");
const monthlyHours_service_1 = require("../hr/guardAttendance/monthlyHours.service");
const guardPayrollConfig_service_1 = require("./guardPayrollConfig.service");
const siteCompensation_service_1 = require("./siteCompensation.service");
const guardPayrollLock_service_1 = require("./guardPayrollLock.service");
const guardPayrollEngine_1 = require("./guardPayrollEngine");
const statutory_service_1 = require("../payrollCommon/statutory.service");
const deductions_service_1 = require("../payrollCommon/deductions.service");
const attendanceSummary_service_1 = require("../payrollCommon/attendanceSummary.service");
const ApiError_1 = require("../../common/ApiError");
const AuditService_1 = require("../../core/audit/AuditService");
const types_1 = require("../../types");
const EDITABLE_STATUSES = [types_1.PayrollRecordStatus.DRAFT, types_1.PayrollRecordStatus.CALCULATED, types_1.PayrollRecordStatus.RETURNED];
const ZERO_HOURS = { normalHours: 0, holidayHours: 0, sundayHours: 0 };
function monthWindow(periodKey) {
    if (!/^\d{4}-\d{2}$/.test(periodKey))
        throw ApiError_1.ApiError.badRequest('periodKey must be in YYYY-MM format');
    const [year, month] = periodKey.split('-').map(Number);
    if (month < 1 || month > 12)
        throw ApiError_1.ApiError.badRequest('periodKey month must be between 01 and 12');
    return {
        year,
        month,
        start: new Date(Date.UTC(year, month - 1, 1)),
        end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    };
}
/**
 * GUARD PAYROLL RUN SERVICE — high-performance, batch-calculated orchestrator.
 */
class GuardPayrollRunService {
    // ───────────────────────────────────────────────────────────────────
    // Calculation
    // ───────────────────────────────────────────────────────────────────
    /**
     * Create or recalculate the run for a month using batch queries and bulk insert.
     */
    static async calculate(periodKey, userId, auditCtx) {
        const { year, month, start, end } = monthWindow(periodKey);
        let run = await GuardPayrollRun_1.GuardPayrollRun.findOne({ periodKey });
        if (run && !EDITABLE_STATUSES.includes(run.status)) {
            throw ApiError_1.ApiError.conflict(`Payroll for ${periodKey} is ${run.status}. RETURN it for correction before recalculating.`);
        }
        if (!run) {
            run = await GuardPayrollRun_1.GuardPayrollRun.create({ periodKey, status: types_1.PayrollRecordStatus.DRAFT });
        }
        const wasReturned = run.status === types_1.PayrollRecordStatus.RETURNED;
        const config = await guardPayrollConfig_service_1.GuardPayrollConfigService.getNumbers();
        const [pensionRule, taxTable] = await Promise.all([
            statutory_service_1.StatutoryService.getPensionRuleForPeriod(start),
            statutory_service_1.StatutoryService.getTaxTableForPeriod(start),
        ]);
        const taxBrackets = taxTable?.brackets?.length ? taxTable.brackets : [];
        const guards = await Employee_1.Employee.find({
            category: types_1.EmployeeCategory.GUARD,
            status: { $in: [types_1.EmployeeStatus.ACTIVE, types_1.EmployeeStatus.CONTRACTED] },
        }).sort({ employeeCode: 1 });
        const hoursFeed = await monthlyHours_service_1.GuardMonthlyHoursService.getPayrollHours(year, month);
        const hoursByGuard = new Map(hoursFeed.guards.map((g) => [g.guardId, g]));
        const guardIds = guards.map((g) => g._id);
        // Batch fetch assignments, contracts, compensations, and deductions in parallel
        const [assignments, contracts, deductionsMap] = await Promise.all([
            PrimarySiteAssignment_1.PrimarySiteAssignment.find({
                guardId: { $in: guardIds },
                effectiveFrom: { $lte: end },
                $or: [{ effectiveTo: null }, { effectiveTo: { $exists: false } }, { effectiveTo: { $gte: start } }],
            }).populate('siteId', 'siteName siteCode status'),
            Contract_1.Contract.find({
                employeeId: { $in: guardIds },
                status: 'ACTIVE',
                contractStartDate: { $lte: end },
                $or: [{ contractEndDate: null }, { contractEndDate: { $exists: false } }, { contractEndDate: { $gte: start } }],
            }).sort({ contractStartDate: -1 }),
            deductions_service_1.DeductionsService.listForPeriodBatch(guardIds, periodKey),
        ]);
        const assignmentsByGuard = new Map();
        for (const a of assignments) {
            const key = a.guardId.toString();
            if (!assignmentsByGuard.has(key))
                assignmentsByGuard.set(key, []);
            assignmentsByGuard.get(key).push(a);
        }
        const contractsByGuard = new Map();
        for (const c of contracts) {
            const key = c.employeeId.toString();
            if (!contractsByGuard.has(key))
                contractsByGuard.set(key, c);
        }
        const relevantSiteIds = new Set();
        for (const a of assignments) {
            if (a.siteId?._id)
                relevantSiteIds.add(a.siteId._id.toString());
        }
        for (const g of hoursFeed.guards) {
            for (const s of g.sites)
                relevantSiteIds.add(s.siteId);
        }
        const [compensations, siteMetaDocs] = await Promise.all([
            siteCompensation_service_1.SiteCompensationService.getForSites(Array.from(relevantSiteIds), start, end),
            Employee_1.Employee.db.model('Site').find({ _id: { $in: Array.from(relevantSiteIds) } }).select('siteName siteCode status').lean(),
        ]);
        const siteMeta = new Map(siteMetaDocs.map((s) => [s._id.toString(), s]));
        const problems = [];
        const recordDocs = [];
        for (const guard of guards) {
            const guardKey = guard._id.toString();
            const guardName = `${guard.firstName} ${guard.lastName}`.trim();
            const guardAssignments = assignmentsByGuard.get(guardKey) || [];
            if (guardAssignments.length === 0) {
                problems.push({
                    employeeId: guard._id,
                    employeeCode: guard.employeeCode,
                    guardName,
                    code: 'NO_PRIMARY_SITE',
                    message: 'No primary site assignment active for this period',
                });
                continue;
            }
            if (guardAssignments.length > 1) {
                problems.push({
                    employeeId: guard._id,
                    employeeCode: guard.employeeCode,
                    guardName,
                    code: 'MULTIPLE_PRIMARY_SITES',
                    message: `Multiple overlapping primary site assignments (${guardAssignments.length})`,
                });
                continue;
            }
            const primaryAssignment = guardAssignments[0];
            const primarySite = primaryAssignment.siteId;
            const primarySiteId = (primarySite?._id || primarySite).toString();
            const primaryCompensation = compensations.get(primarySiteId);
            if (!primaryCompensation) {
                problems.push({
                    employeeId: guard._id,
                    employeeCode: guard.employeeCode,
                    guardName,
                    code: 'NO_SITE_COMPENSATION',
                    message: `No compensation rate configured for primary site "${primarySite?.siteName || primarySiteId}"`,
                });
                continue;
            }
            const guardHours = hoursByGuard.get(guardKey);
            const hoursBySiteId = new Map(guardHours?.sites.map((s) => [s.siteId, s]) || []);
            const hoursForSite = (siteId) => {
                const found = hoursBySiteId.get(siteId);
                if (!found)
                    return ZERO_HOURS;
                return {
                    normalHours: found.normalHours || 0,
                    holidayHours: found.holidayHours || 0,
                    sundayHours: found.sundayHours || 0,
                };
            };
            const additionalSites = [];
            let missingCompForAdditional = false;
            for (const siteEntry of guardHours?.sites || []) {
                if (siteEntry.siteId === primarySiteId)
                    continue;
                const comp = compensations.get(siteEntry.siteId);
                if (!comp) {
                    problems.push({
                        employeeId: guard._id,
                        employeeCode: guard.employeeCode,
                        guardName,
                        code: 'NO_ADDITIONAL_SITE_COMPENSATION',
                        message: `No compensation rate for additional site "${siteMeta.get(siteEntry.siteId)?.siteName || siteEntry.siteId}"`,
                    });
                    missingCompForAdditional = true;
                    break;
                }
                additionalSites.push({
                    siteId: siteEntry.siteId,
                    compensationAmount: comp.compensationAmount,
                    hours: {
                        normalHours: siteEntry.normalHours || 0,
                        holidayHours: siteEntry.holidayHours || 0,
                        sundayHours: siteEntry.sundayHours || 0,
                    },
                });
            }
            if (missingCompForAdditional)
                continue;
            const contract = contractsByGuard.get(guardKey);
            const warnings = [];
            if (!contract) {
                warnings.push('No active contract found for this period — pension was not applied.');
            }
            if (!pensionRule)
                warnings.push('No pension rule is configured for this period — pension was not applied.');
            if (!taxBrackets.length)
                warnings.push('No income tax table is configured for this period — income tax was not applied.');
            // O(1) in-memory lookup from pre-fetched batch map
            const deductions = deductionsMap.get(guardKey) || [];
            const result = (0, guardPayrollEngine_1.computeGuardPayroll)({
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
            recordDocs.push({
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
            });
        }
        // Atomically wipe previous calculation and insert all calculated records in bulk
        await GuardPayrollRecord_1.GuardPayrollRecord.deleteMany({ runId: run._id });
        const records = recordDocs.length > 0 ? await GuardPayrollRecord_1.GuardPayrollRecord.insertMany(recordDocs) : [];
        const totals = {
            guards: records.length,
            grossEarnings: (0, guardPayrollEngine_1.round2)(records.reduce((s, r) => s + r.grossEarnings, 0)),
            employeePension: (0, guardPayrollEngine_1.round2)(records.reduce((s, r) => s + r.employeePension, 0)),
            employerPension: (0, guardPayrollEngine_1.round2)(records.reduce((s, r) => s + r.employerPension, 0)),
            incomeTax: (0, guardPayrollEngine_1.round2)(records.reduce((s, r) => s + r.incomeTax, 0)),
            totalDeductions: (0, guardPayrollEngine_1.round2)(records.reduce((s, r) => s + r.totalDeductions, 0)),
            netPay: (0, guardPayrollEngine_1.round2)(records.reduce((s, r) => s + r.netPay, 0)),
        };
        run.status = types_1.PayrollRecordStatus.CALCULATED;
        run.calculatedBy = userId;
        run.calculatedAt = new Date();
        run.problems = problems;
        run.totals = totals;
        await run.save();
        await AuditService_1.AuditService.log({
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
    static async listRuns(filters = {}) {
        const query = {};
        if (filters.periodKey)
            query.periodKey = filters.periodKey;
        if (filters.status)
            query.status = filters.status;
        return GuardPayrollRun_1.GuardPayrollRun.find(query).sort({ periodKey: -1 }).limit(120);
    }
    static async getRun(runId) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id })
            .populate('primarySite.siteId', 'siteName siteCode')
            .sort({ 'snapshot.employeeCode': 1 });
        const attendance = await attendanceSummary_service_1.AttendanceSummaryService.forRun('GUARD', run.periodKey, records.map((r) => r.employeeId.toString()));
        return { run, records, attendance };
    }
    static async getRecord(recordId) {
        if (!recordId || !mongoose_1.default.Types.ObjectId.isValid(recordId)) {
            throw ApiError_1.ApiError.badRequest(`Invalid record ID: "${recordId}"`);
        }
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId)
            .populate('primarySite.siteId', 'siteName siteCode')
            .populate('additionalSites.siteId', 'siteName siteCode');
        if (!record)
            throw ApiError_1.ApiError.notFound('Guard payroll record not found');
        return record;
    }
    /** Guard self-service: the signed-in user's own payroll history. */
    static async myPayroll(userId, periodKey) {
        const user = await User_1.User.findById(userId);
        if (!user?.employeeId)
            throw ApiError_1.ApiError.badRequest('Your account is not linked to an employee record');
        const query = { employeeId: user.employeeId };
        if (periodKey)
            query.periodKey = periodKey;
        return GuardPayrollRecord_1.GuardPayrollRecord.find(query).sort({ periodKey: -1 }).limit(36);
    }
    /** Attendance lock state for the UI (Operations/HR attendance pages). */
    static async getAttendanceLock(periodKey) {
        monthWindow(periodKey);
        return guardPayrollLock_service_1.GuardPayrollLockService.getLockInfo(periodKey);
    }
    // ───────────────────────────────────────────────────────────────────
    // Lifecycle
    // ───────────────────────────────────────────────────────────────────
    static async loadRun(runId) {
        if (!runId || !mongoose_1.default.Types.ObjectId.isValid(runId)) {
            throw ApiError_1.ApiError.badRequest(`Invalid run ID: "${runId}"`);
        }
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        return run;
    }
    static assertStatus(run, allowed, action) {
        if (!allowed.includes(run.status)) {
            throw ApiError_1.ApiError.conflict(`Cannot ${action}: payroll is ${run.status} (expected ${allowed.join(' or ')}).`);
        }
    }
    /** CALCULATED → SUBMITTED. Locks attendance for the month. */
    static async submit(runId, userId, auditCtx) {
        const run = await this.loadRun(runId);
        this.assertStatus(run, [types_1.PayrollRecordStatus.CALCULATED], 'submit');
        if (run.problems.length > 0) {
            throw ApiError_1.ApiError.badRequest(`Resolve ${run.problems.length} payroll problem(s) before submitting (e.g. guards without a primary site).`);
        }
        run.status = types_1.PayrollRecordStatus.SUBMITTED;
        run.submittedBy = userId;
        run.submittedAt = new Date();
        await run.save();
        await this.log(userId, 'GUARD_PAYROLL_SUBMIT', run, auditCtx);
        return this.getRun(runId);
    }
    /** SUBMITTED → CHECKED. */
    static async check(runId, userId, auditCtx) {
        const run = await this.loadRun(runId);
        this.assertStatus(run, [types_1.PayrollRecordStatus.SUBMITTED], 'check');
        run.status = types_1.PayrollRecordStatus.CHECKED;
        run.checkedBy = userId;
        run.checkedAt = new Date();
        await run.save();
        await this.log(userId, 'GUARD_PAYROLL_CHECK', run, auditCtx);
        return this.getRun(runId);
    }
    /** CHECKED → APPROVED. Settles loan/advance balances for the deductions taken. */
    static async approve(runId, userId, auditCtx) {
        const run = await this.loadRun(runId);
        this.assertStatus(run, [types_1.PayrollRecordStatus.CHECKED], 'approve');
        run.status = types_1.PayrollRecordStatus.APPROVED;
        run.approvedBy = userId;
        run.approvedAt = new Date();
        await run.save();
        const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id });
        await deductions_service_1.DeductionsService.settleRun(records);
        await this.log(userId, 'GUARD_PAYROLL_APPROVE', run, auditCtx);
        return this.getRun(runId);
    }
    /**
     * SUBMITTED / CHECKED / APPROVED → RETURNED.
     * If returned after approval, loan settlements are safely rolled back to prevent double deduction.
     */
    static async returnForCorrection(runId, reason, userId, auditCtx) {
        const run = await this.loadRun(runId);
        if (!reason || !reason.trim())
            throw ApiError_1.ApiError.badRequest('A reason is required to return payroll for correction');
        this.assertStatus(run, [types_1.PayrollRecordStatus.SUBMITTED, types_1.PayrollRecordStatus.CHECKED, types_1.PayrollRecordStatus.APPROVED], 'return');
        const wasApproved = run.status === types_1.PayrollRecordStatus.APPROVED;
        run.status = types_1.PayrollRecordStatus.RETURNED;
        run.returnHistory.push({ reason: reason.trim(), returnedBy: userId, returnedAt: new Date() });
        await run.save();
        // Revert deduction balances if the run had previously been approved
        if (wasApproved) {
            const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id });
            await deductions_service_1.DeductionsService.revertRun(records);
        }
        await this.log(userId, 'GUARD_PAYROLL_RETURN', run, auditCtx, reason.trim());
        return this.getRun(runId);
    }
    /** APPROVED → PAID. Final — the run is never re-opened after payment. */
    static async markPaid(runId, paymentRef, userId, auditCtx) {
        const run = await this.loadRun(runId);
        this.assertStatus(run, [types_1.PayrollRecordStatus.APPROVED], 'mark paid');
        run.status = types_1.PayrollRecordStatus.PAID;
        run.paidBy = userId;
        run.paidAt = new Date();
        if (paymentRef)
            run.paymentRef = paymentRef;
        await run.save();
        await this.log(userId, 'GUARD_PAYROLL_PAY', run, auditCtx);
        return this.getRun(runId);
    }
    // ───────────────────────────────────────────────────────────────────
    // Exports & Payslips
    // ───────────────────────────────────────────────────────────────────
    /** Export bank disbursement batch CSV (CBE / Awash / Dashen / All). */
    static async exportBankDisbursement(runId, bankFilter) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });
        const filtered = bankFilter && bankFilter !== 'ALL'
            ? records.filter((r) => (r.snapshot.bankName || '').toLowerCase().includes(bankFilter.toLowerCase()))
            : records;
        const headers = ['Employee Code', 'Beneficiary Full Name', 'Bank Name', 'Account Number', 'Net Pay (ETB)', 'Reference', 'Narration'];
        const rows = filtered.map((r) => [
            r.snapshot.employeeCode || '',
            `"${(r.snapshot.fullName || '').replace(/"/g, '""')}"`,
            `"${(r.snapshot.bankName || 'CBE').replace(/"/g, '""')}"`,
            `"${r.snapshot.accountNumber || ''}"`,
            r.netPay.toFixed(2),
            `"PAY-${run.periodKey}-${r.snapshot.employeeCode || ''}"`,
            `"Vital Security Guard Salary ${run.periodKey}"`,
        ]);
        return {
            filename: `guard-bank-disbursement-${run.periodKey}${bankFilter ? `-${bankFilter}` : ''}.csv`,
            csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
        };
    }
    /** Statutory income tax schedule export (ERCA). */
    static async exportTaxReport(runId) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });
        const headers = [
            'Employee Code',
            'Full Name',
            'Gross Salary (ETB)',
            'Non-Taxable Transport (ETB)',
            'Taxable Earnings (ETB)',
            'Tax Withheld (ETB)',
            'Period',
        ];
        const rows = records.map((r) => [
            r.snapshot.employeeCode || '',
            `"${(r.snapshot.fullName || '').replace(/"/g, '""')}"`,
            r.grossEarnings.toFixed(2),
            (r.primarySite.transportPaid || 0).toFixed(2),
            r.taxableEarnings.toFixed(2),
            r.incomeTax.toFixed(2),
            run.periodKey,
        ]);
        return {
            filename: `guard-tax-declaration-${run.periodKey}.csv`,
            csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
        };
    }
    /** Statutory pension schedule export (POESSA 7% / 11%). */
    static async exportPensionReport(runId) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });
        const headers = [
            'Employee Code',
            'Full Name',
            'Pension Enrolled',
            'Pension Base (ETB)',
            'Employee Share 7% (ETB)',
            'Employer Share 11% (ETB)',
            'Total POESSA Remittance 18% (ETB)',
            'Period',
        ];
        const rows = records.map((r) => [
            r.snapshot.employeeCode || '',
            `"${(r.snapshot.fullName || '').replace(/"/g, '""')}"`,
            r.snapshot.pensionEnrolled ? 'YES' : 'NO',
            r.pensionBase.toFixed(2),
            r.employeePension.toFixed(2),
            r.employerPension.toFixed(2),
            (0, guardPayrollEngine_1.round2)(r.employeePension + r.employerPension).toFixed(2),
            run.periodKey,
        ]);
        return {
            filename: `guard-pension-poessa-${run.periodKey}.csv`,
            csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
        };
    }
    /** Formatted Official Payslip Document Data. */
    static async getPayslip(recordId) {
        const record = await this.getRecord(recordId);
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(record.runId);
        return {
            company: {
                name: 'VITAL SECURITY SERVICES PLC',
                address: 'Bole Sub-City, Addis Ababa, Ethiopia',
                department: 'Security Guard Patrol & Operations',
            },
            period: record.periodKey,
            status: run?.status || 'CALCULATED',
            employee: {
                id: record.employeeId,
                code: record.snapshot.employeeCode,
                fullName: record.snapshot.fullName,
                bankName: record.snapshot.bankName,
                accountNumber: record.snapshot.accountNumber,
                pensionEnrolled: record.snapshot.pensionEnrolled,
            },
            earnings: {
                primarySite: {
                    name: record.primarySite.siteName,
                    code: record.primarySite.siteCode,
                    normalHours: record.primarySite.normalHours,
                    normalPay: record.primarySite.normalPay,
                    sundayHours: record.primarySite.sundayHours,
                    sundayPay: record.primarySite.sundayPay,
                    holidayHours: record.primarySite.holidayHours,
                    holidayPay: record.primarySite.holidayPay,
                    transportPaid: record.primarySite.transportPaid,
                },
                additionalSites: record.additionalSites.map((s) => ({
                    name: s.siteName,
                    code: s.siteCode,
                    totalHours: s.totalHours,
                    siteEarnings: s.siteEarnings,
                })),
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
            generatedAt: new Date().toISOString(),
            watermark: `VTL-SEC-${record._id.toString().slice(-8).toUpperCase()}`,
        };
    }
    static async log(userId, action, run, auditCtx, reason) {
        await AuditService_1.AuditService.log({
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
exports.GuardPayrollRunService = GuardPayrollRunService;
//# sourceMappingURL=guardPayrollRun.service.js.map