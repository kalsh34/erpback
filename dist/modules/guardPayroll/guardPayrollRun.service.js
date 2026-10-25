"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollRunService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const node_crypto_1 = require("node:crypto");
const GuardSiteCompensation_1 = require("../../models/GuardSiteCompensation");
const EmployeeDeduction_1 = require("../../models/EmployeeDeduction");
const assignmentTimeline_1 = require("./assignmentTimeline");
const payrollTransaction_1 = require("./payrollTransaction");
const GuardPayrollRun_1 = require("../../models/GuardPayrollRun");
const GuardPayrollRecord_1 = require("../../models/GuardPayrollRecord");
const StaffPayrollRecord_1 = require("../../models/StaffPayrollRecord");
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
    if (year < 2000 || year > 2100)
        throw ApiError_1.ApiError.badRequest('periodKey year must be a realistic payroll year (2000–2100)');
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
    static async calculate(periodKey, userId, auditCtx, opts) {
        return (0, payrollTransaction_1.payrollTransaction)(() => this.calculateTransactional(periodKey, userId, auditCtx, opts));
    }
    static async calculateTransactional(periodKey, userId, auditCtx, opts) {
        const { year, month, start, end } = monthWindow(periodKey);
        const EDITABLE = () => run && EDITABLE_STATUSES.includes(run.status);
        let run = await GuardPayrollRun_1.GuardPayrollRun.findOne({ periodKey });
        if (!run) {
            // Concurrent calculations race on the unique periodKey index: the loser
            // gets a duplicate-key error instead of the wrong message. Re-find and
            // continue with the winner's run when it is still editable.
            try {
                run = await GuardPayrollRun_1.GuardPayrollRun.create({ periodKey, status: types_1.PayrollRecordStatus.DRAFT });
            }
            catch (err) {
                if (err?.code === 11000) {
                    run = await GuardPayrollRun_1.GuardPayrollRun.findOne({ periodKey });
                    if (!run)
                        throw err;
                }
                else {
                    throw err;
                }
            }
        }
        if (!EDITABLE()) {
            throw ApiError_1.ApiError.conflict(`Payroll for ${periodKey} is ${run.status}. RETURN it for correction before recalculating.`);
        }
        const wasReturned = run.status === types_1.PayrollRecordStatus.RETURNED;
        const inputFingerprint = await this.inputFingerprint(periodKey);
        const config = await guardPayrollConfig_service_1.GuardPayrollConfigService.getNumbers();
        const [pensionRule, taxTable] = await Promise.all([
            statutory_service_1.StatutoryService.getPensionRuleForPeriod(start),
            statutory_service_1.StatutoryService.getTaxTableForPeriod(start),
        ]);
        const taxBrackets = taxTable?.brackets?.length ? taxTable.brackets : [];
        if (!taxBrackets.length)
            throw ApiError_1.ApiError.badRequest('Configure the Guard income tax table for this period before calculating payroll.');
        // Run-level blocker: the pension rule applies to every enrolled guard, so a
        // missing rule would corrupt every payslip — never produce one.
        if (!pensionRule)
            throw ApiError_1.ApiError.badRequest('Configure an effective Guard pension rule for this period before calculating payroll.');
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
        // ── Scope resolution ─────────────────────────────────────────────
        // The run's scope is a primary site: only guards whose effective primary
        // site in the period is that site belong to the run when scoped.
        const scopeOpt = opts?.siteId && opts.siteId !== 'ALL' ? opts.siteId : null;
        const scopeSiteId = scopeOpt && mongoose_1.default.Types.ObjectId.isValid(scopeOpt) ? new mongoose_1.default.Types.ObjectId(scopeOpt) : null;
        if (scopeOpt && !scopeSiteId)
            throw ApiError_1.ApiError.badRequest(`Invalid siteId scope: "${scopeOpt}"`);
        const mode = opts?.mode === 'remaining' ? 'remaining' : 'full';
        /** Guards in the active scope, keyed by id, with their resolved primary. */
        const scopePrimary = new Map();
        let scopedGuards;
        if (scopeSiteId) {
            for (const guard of guards) {
                const guardAssignments = assignmentsByGuard.get(guard._id.toString()) || [];
                const resolution = (0, assignmentTimeline_1.resolveMonthlyPrimary)(guardAssignments, start, end);
                const primarySite = resolution.assignment?.siteId;
                const pid = primarySite ? (primarySite._id || primarySite).toString() : null;
                if (pid && pid === scopeSiteId.toString())
                    scopePrimary.set(guard._id.toString(), resolution.assignment);
            }
            scopedGuards = guards.filter((g) => scopePrimary.has(g._id.toString()));
        }
        else {
            scopedGuards = guards;
        }
        // Existing records: 'remaining' mode must never touch or duplicate them.
        const existingRecords = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).select('employeeId').lean();
        const existingIds = new Set(existingRecords.map((r) => String(r.employeeId)));
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
            Employee_1.Employee.db.model('Site').find({ _id: { $in: Array.from(relevantSiteIds) } }).select('siteName siteCode status taxCenter pensionSite').lean(),
        ]);
        const siteMeta = new Map(siteMetaDocs.map((s) => [s._id.toString(), s]));
        const problems = [];
        const guardWarnings = [];
        const recordDocs = [];
        for (const guard of scopedGuards) {
            const guardKey = guard._id.toString();
            // Incremental re-run: never touch or duplicate an existing record.
            if (mode === 'remaining' && existingIds.has(guardKey))
                continue;
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
            const resolution = (0, assignmentTimeline_1.resolveMonthlyPrimary)(guardAssignments, start, end);
            if (!resolution.assignment) {
                problems.push({ employeeId: guard._id, employeeCode: guard.employeeCode, guardName,
                    code: resolution.code, message: resolution.message });
                continue;
            }
            const primaryAssignment = resolution.assignment;
            const additionalAssignments = guardAssignments.filter((a) => !a.isPrimary);
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
            const missingAttendance = guardAssignments.filter((a) => !hoursBySiteId.has((a.siteId?._id || a.siteId).toString()));
            if (missingAttendance.length) {
                problems.push({ employeeId: guard._id, employeeCode: guard.employeeCode, guardName,
                    code: 'MISSING_ATTENDANCE', message: `Missing attendance for ${missingAttendance.map(a => a.siteId?.siteName || a.siteId).join(', ')} in ${periodKey}. Enter monthly hours or daily attendance before calculating.` });
                continue;
            }
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
            const additionalSiteIds = new Set(additionalAssignments.map((a) => (a.siteId?._id || a.siteId).toString()));
            const additionalSites = [];
            const warnings2 = [];
            let missingCompForAdditional = false;
            // Sources for billable additional sites: hours actually worked at any
            // non-primary site, PLUS current secondary assignments (even with 0 h).
            const secondaryEntries = [
                ...(guardHours?.sites || []).filter((s) => s.siteId !== primarySiteId),
                ...additionalAssignments.map((a) => ({
                    siteId: (a.siteId?._id || a.siteId).toString(),
                    normalHours: 0,
                    holidayHours: 0,
                    sundayHours: 0,
                })),
            ];
            const seenSecondary = new Set();
            for (const siteEntry of secondaryEntries) {
                if (seenSecondary.has(siteEntry.siteId))
                    continue;
                seenSecondary.add(siteEntry.siteId);
                const entryHours = hoursBySiteId.get(siteEntry.siteId);
                const hours = {
                    normalHours: entryHours?.normalHours || 0,
                    holidayHours: entryHours?.holidayHours || 0,
                    sundayHours: entryHours?.sundayHours || 0,
                };
                if (hours.normalHours + hours.holidayHours + hours.sundayHours === 0)
                    continue;
                const comp = compensations.get(siteEntry.siteId);
                if (!comp) {
                    // Warn but keep the guard: they still have a primary-site record to
                    // pay. Previously this dropped the ENTIRE record and, since submit
                    // blocks on any problem, left the whole run stuck with no way to see
                    // the guard's pay at all.
                    missingCompForAdditional = true;
                    warnings2.push({
                        employeeId: guard._id,
                        employeeCode: guard.employeeCode,
                        guardName,
                        code: 'NO_ADDITIONAL_SITE_COMPENSATION',
                        message: `No compensation rate for additional site "${siteMeta.get(siteEntry.siteId)?.siteName || siteEntry.siteId}" — hours at this site are NOT paid. Configure the rate, then recalculate.`,
                    });
                    continue;
                }
                additionalSites.push({
                    siteId: siteEntry.siteId,
                    compensationAmount: comp.compensationAmount,
                    formula: comp.formula,
                    hours,
                });
            }
            guardWarnings.push(...warnings2);
            if (missingCompForAdditional)
                continue;
            const contract = contractsByGuard.get(guardKey);
            if (!contract || typeof contract.pensionEnrolled !== 'boolean' || (contract.pensionEnrolled && !pensionRule)) {
                problems.push({ employeeId: guard._id, employeeCode: guard.employeeCode, guardName,
                    code: !contract || typeof contract.pensionEnrolled !== 'boolean' ? 'MISSING_PENSION_ENROLLMENT' : 'MISSING_STATUTORY_CONFIG',
                    message: 'Confirm effective contract pension enrollment and the applicable Guard pension rule before calculating.' });
                continue;
            }
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
                primary: { siteId: primarySiteId, compensationAmount: primaryCompensation.compensationAmount, formula: primaryCompensation.formula, hours: hoursForSite(primarySiteId) },
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
                    taxCenter: siteMeta.get(primarySiteId)?.taxCenter || '',
                    pensionCenter: siteMeta.get(primarySiteId)?.pensionSite || '',
                    ...result.primary,
                    transportPercent: result.primary.transportPercent,
                    standardMonthlyHours: result.primary.standardMonthlyHours ?? config.standardMonthlyHours,
                    sundayStructuralHours: result.primary.sundayStructuralHours ?? config.sundayStructuralHours,
                    basicHourlyDivisor: result.primary.basicHourlyDivisor ?? config.basicHourlyDivisor,
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
        // Atomically wipe previous calculation (only within the scope) and insert
        // all calculated records in bulk. 'remaining' never deletes: it only adds.
        if (mode === 'full') {
            await GuardPayrollRecord_1.GuardPayrollRecord.deleteMany(scopeSiteId ? { runId: run._id, employeeId: { $in: scopedGuards.map((g) => g._id) } } : { runId: run._id });
        }
        const records = recordDocs.length > 0 ? await GuardPayrollRecord_1.GuardPayrollRecord.insertMany(recordDocs, { ordered: false }) : [];
        // Merge problems: per-scope results replace prior problems for scoped
        // guards; other sites' previously recorded problems are preserved.
        const scopedIds = new Set(scopedGuards.map((g) => String(g._id)));
        const preservedProblems = run.problems.filter((p) => !scopedIds.has(String(p.employeeId)));
        // Totals always reflect the whole run (all records, not just this pass).
        const allRecords = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).select('grossEarnings employeePension employerPension incomeTax totalDeductions netPay').lean();
        const totals = {
            guards: allRecords.length,
            grossEarnings: (0, guardPayrollEngine_1.round2)(allRecords.reduce((s, r) => s + (r.grossEarnings || 0), 0)),
            employeePension: (0, guardPayrollEngine_1.round2)(allRecords.reduce((s, r) => s + (r.employeePension || 0), 0)),
            employerPension: (0, guardPayrollEngine_1.round2)(allRecords.reduce((s, r) => s + (r.employerPension || 0), 0)),
            incomeTax: (0, guardPayrollEngine_1.round2)(allRecords.reduce((s, r) => s + (r.incomeTax || 0), 0)),
            totalDeductions: (0, guardPayrollEngine_1.round2)(allRecords.reduce((s, r) => s + (r.totalDeductions || 0), 0)),
            netPay: (0, guardPayrollEngine_1.round2)(allRecords.reduce((s, r) => s + (r.netPay || 0), 0)),
        };
        // Final guard right before the records/totals are committed: a run that
        // was SUBMITTED/CHECKED/APPROVED/PAID while this long calculation ran
        // must NOT be overwritten (defect fixed 2026-10, see stabilization report).
        const freshStatus = (await GuardPayrollRun_1.GuardPayrollRun.findById(run._id).select('status').lean());
        if (freshStatus && !EDITABLE_STATUSES.includes(freshStatus.status)) {
            throw ApiError_1.ApiError.conflict(`Payroll for ${periodKey} moved to ${freshStatus.status} during calculation; recalculating was aborted. RETURN it for correction first.`);
        }
        run.status = types_1.PayrollRecordStatus.CALCULATED;
        run.calculatedBy = userId;
        run.calculatedAt = new Date();
        run.inputFingerprint = inputFingerprint;
        // Merge the per-guard NO_ADDITIONAL_SITE_COMPENSATION warnings collected
        // during the loop so they are visible on the run (not swallowed).
        run.problems = [...preservedProblems, ...problems, ...guardWarnings];
        run.scopeSiteId = scopeSiteId;
        run.scopeSiteName = scopeSiteId ? String(siteMeta.get(scopeSiteId.toString())?.siteName || '') : '';
        run.lastCalcMode = mode;
        run.totals = totals;
        await run.save();
        await AuditService_1.AuditService.log({
            userId,
            action: wasReturned ? 'GUARD_PAYROLL_RECALCULATE' : 'GUARD_PAYROLL_CALCULATE',
            entity: 'GuardPayrollRun',
            entityId: run._id.toString(),
            newValues: { periodKey, status: run.status, guards: totals.guards, netPay: totals.netPay, problems: problems.length, scope: scopeSiteId?.toString() || 'ALL', mode },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        return this.getRun(run._id.toString());
    }
    /** Stable digest of authoritative inputs; an editable calculation may become stale. */
    static async inputFingerprint(periodKey) {
        const { year, month, start, end } = monthWindow(periodKey);
        const guards = await Employee_1.Employee.find({ category: types_1.EmployeeCategory.GUARD, status: { $in: [types_1.EmployeeStatus.ACTIVE, types_1.EmployeeStatus.CONTRACTED] } })
            .select('employeeCode firstName lastName bankName accountNumber status').sort({ _id: 1 }).lean();
        const ids = guards.map(g => g._id);
        const [hours, assignments, contracts, rates, deductions, config, tax, pension] = await Promise.all([
            monthlyHours_service_1.GuardMonthlyHoursService.getPayrollHours(year, month),
            PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: { $in: ids }, effectiveFrom: { $lte: end }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }] }).select('guardId siteId isPrimary effectiveFrom effectiveTo').sort({ _id: 1 }).lean(),
            Contract_1.Contract.find({ employeeId: { $in: ids }, status: 'ACTIVE', contractStartDate: { $lte: end }, $or: [{ contractEndDate: null }, { contractEndDate: { $gte: start } }] }).select('employeeId contractStartDate contractEndDate pensionEnrolled contractType wage').sort({ _id: 1 }).lean(),
            GuardSiteCompensation_1.GuardSiteCompensation.find({ effectiveFrom: { $lte: end }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }] }).select('siteId compensationAmount formula effectiveFrom effectiveTo').sort({ _id: 1 }).lean(),
            EmployeeDeduction_1.EmployeeDeduction.find({ employeeId: { $in: ids }, status: 'ACTIVE' }).sort({ _id: 1 }).lean(),
            guardPayrollConfig_service_1.GuardPayrollConfigService.getNumbers(), statutory_service_1.StatutoryService.getTaxTableForPeriod(start), statutory_service_1.StatutoryService.getPensionRuleForPeriod(start),
        ]);
        const canonicalHours = hours.guards.sort((a, b) => a.guardId.localeCompare(b.guardId)).map(g => ({ guardId: g.guardId, sites: g.sites.sort((a, b) => a.siteId.localeCompare(b.siteId)) }));
        return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ guards, hours: canonicalHours, assignments, contracts, rates, deductions, config, tax: tax?.toObject(), pension: pension?.toObject() })).digest('hex');
    }
    /** Read-only period preflight, using the same canonical site-hours and effective rates as calculation. */
    static async readiness(periodKey) {
        const { year, month, start, end } = monthWindow(periodKey);
        const guards = await Employee_1.Employee.find({ category: types_1.EmployeeCategory.GUARD, status: { $in: [types_1.EmployeeStatus.ACTIVE, types_1.EmployeeStatus.CONTRACTED] } }).sort({ employeeCode: 1 });
        const ids = guards.map(g => g._id);
        const [assignments, contracts, feed, tax, pension, lock] = await Promise.all([
            PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: { $in: ids }, effectiveFrom: { $lte: end }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }] }).populate('siteId', 'siteName siteCode'),
            Contract_1.Contract.find({ employeeId: { $in: ids }, status: 'ACTIVE', contractStartDate: { $lte: end }, $or: [{ contractEndDate: null }, { contractEndDate: { $gte: start } }] }).sort({ contractStartDate: -1 }),
            monthlyHours_service_1.GuardMonthlyHoursService.getPayrollHours(year, month), statutory_service_1.StatutoryService.getTaxTableForPeriod(start), statutory_service_1.StatutoryService.getPensionRuleForPeriod(start), guardPayrollLock_service_1.GuardPayrollLockService.getLockInfo(periodKey),
        ]);
        const issues = [];
        if (!guards.length)
            issues.push({ code: 'NO_GUARDS', message: 'Register guards and complete their effective contracts before preparing payroll.' });
        if (!tax?.brackets.length)
            issues.push({ code: 'MISSING_STATUTORY_CONFIG', message: 'Configure an effective Guard income tax table in Payroll Settings.' });
        if (!pension)
            issues.push({ code: 'MISSING_PENSION_RULE', message: 'Configure an effective Guard pension rule in Payroll Settings.' });
        const hello = await mongoose_1.default.connection.db.admin().command({ hello: 1 });
        if (!hello.setName && hello.msg !== 'isdbgrid')
            issues.push({ code: 'DATABASE_TRANSACTIONS', message: 'Payroll requires a MongoDB replica set for safe transactions. Ask your administrator to configure it.' });
        let rates = new Map();
        try {
            rates = await siteCompensation_service_1.SiteCompensationService.getForSites([...new Set(assignments.map(a => (a.siteId?._id || a.siteId).toString()))], start, end);
        }
        catch (e) {
            issues.push({ code: 'SITE_COMPENSATION_HISTORY', message: e.message });
        }
        const rows = guards.map(g => {
            const id = g._id.toString(), owned = assignments.filter(a => a.guardId.toString() === id);
            const resolution = (0, assignmentTimeline_1.resolveMonthlyPrimary)(owned, start, end);
            if (!resolution.assignment)
                issues.push({ code: resolution.code || 'NO_PRIMARY_SITE', employeeCode: g.employeeCode, message: resolution.message || 'Select exactly one primary site for this period.' });
            const contract = contracts.find(c => c.employeeId.toString() === id);
            if (!contract || typeof contract.pensionEnrolled !== 'boolean' || (contract.pensionEnrolled && !pension))
                issues.push({ code: 'MISSING_PENSION_ENROLLMENT', employeeCode: g.employeeCode, message: 'Confirm the effective contract and pension enrollment/rule.' });
            const hours = feed.guards.find(h => h.guardId === id);
            const sites = owned.map(a => {
                const site = a.siteId, sid = (site?._id || site).toString(), h = hours?.sites.find(s => s.siteId === sid), rate = rates.get(sid);
                if (!h)
                    issues.push({ code: 'MISSING_ATTENDANCE', employeeCode: g.employeeCode, message: `Enter attendance for ${site?.siteName || sid} in ${periodKey}.` });
                if (!rate)
                    issues.push({ code: 'NO_SITE_COMPENSATION', employeeCode: g.employeeCode, message: `Configure effective compensation for ${site?.siteName || sid}.` });
                return { siteId: sid, siteName: site?.siteName || sid, siteCode: site?.siteCode, isPrimary: !!a.isPrimary, compensationAmount: rate?.compensationAmount ?? null,
                    normalHours: h?.normalHours ?? 0, sundayHours: h?.sundayHours ?? 0, holidayHours: h?.holidayHours ?? 0, source: h?.source || 'MISSING' };
            });
            return { employeeId: id, employeeCode: g.employeeCode, guardName: `${g.firstName} ${g.lastName}`, sites };
        });
        // ── Blocker classification ─────────────────────────────────────
        // Run-level blockers make every calculation wrong (config, database);
        // per-guard blockers mean THAT guard is skipped while the rest proceed.
        const runLevel = issues.filter((i) => !i.employeeCode);
        const perGuardIssues = issues.filter((i) => i.employeeCode);
        const blockedGuards = new Set(perGuardIssues.map((i) => i.employeeCode));
        const grouped = new Map();
        for (const i of perGuardIssues) {
            const g = grouped.get(i.code);
            if (g) {
                g.count += 1;
                g.guards.push({ employeeCode: i.employeeCode, message: i.message });
            }
            else
                grouped.set(i.code, { code: i.code, message: i.message, count: 1, guards: [{ employeeCode: i.employeeCode, message: i.message }] });
        }
        const guardIssues = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
        return {
            periodKey,
            ready: !issues.length,
            guardCount: guards.length,
            issues,
            lock,
            // New Part-2 fields: how many guards can be calculated right now, and
            // exactly which blockers stop the whole run vs skip individual guards.
            readyCount: blockedGuards.size ? guards.length - blockedGuards.size : guards.length,
            runLevel: runLevel.map((i) => ({ code: i.code, message: i.message })),
            guardIssues: guardIssues.map((g) => ({
                code: g.code,
                message: g.message.split('.')[0],
                count: g.count,
                guards: g.guards,
            })),
            rows,
        };
    }
    // ───────────────────────────────────────────────────────────────────
    // Reads
    // ───────────────────────────────────────────────────────────────────
    /** Status-guarded recalculation of an existing run by its id (keeps the run's site scope). */
    static async recalculate(runId, userId, auditCtx) {
        const run = await this.loadRun(runId);
        if (!EDITABLE_STATUSES.includes(run.status)) {
            throw ApiError_1.ApiError.conflict(`Payroll for ${run.periodKey} is ${run.status}. RETURN it for correction before recalculating.`);
        }
        return this.calculate(run.periodKey, userId, auditCtx, { siteId: run.scopeSiteId ? run.scopeSiteId.toString() : null, mode: 'full' });
    }
    static async listRuns(filters = {}) {
        const query = {};
        if (filters.periodKey)
            query.periodKey = filters.periodKey;
        if (filters.status)
            query.status = filters.status;
        return GuardPayrollRun_1.GuardPayrollRun.find(query).sort({ periodKey: -1 }).limit(120);
    }
    static async getRun(runId, siteId) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        let records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });
        // Partial-run info: guards in the run's scope without a record yet.
        const partial = await this.computePartial(run);
        // Optional site filter (primary site matches, ObjectId or embedded doc).
        if (siteId && siteId !== 'ALL') {
            records = records.filter((r) => {
                const psid = r.primarySite?.siteId;
                const resolved = psid?._id ? String(psid._id) : String(psid || '');
                return resolved === String(siteId);
            });
        }
        const attendance = { periodKey: run.periodKey, daysInMonth: new Date(Date.UTC(Number(run.periodKey.slice(0, 4)), Number(run.periodKey.slice(5)), 0)).getUTCDate(),
            kind: 'GUARD', rows: records.map((r) => {
                const saved = r.toObject();
                const sites = [{ ...saved.primarySite, isPrimary: true }, ...saved.additionalSites.map((s) => ({ ...s, isPrimary: false }))];
                const normalHours = (0, guardPayrollEngine_1.round2)(sites.reduce((n, s) => n + s.normalHours, 0));
                const sundayHours = (0, guardPayrollEngine_1.round2)(sites.reduce((n, s) => n + s.sundayHours, 0));
                const holidayHours = (0, guardPayrollEngine_1.round2)(sites.reduce((n, s) => n + s.holidayHours, 0));
                const primaryHours = r.primarySite.normalHours + r.primarySite.sundayHours + r.primarySite.holidayHours;
                return { employeeId: r.employeeId.toString(), source: 'SNAPSHOT', sites,
                    normalHours, sundayHours, holidayHours, totalHours: (0, guardPayrollEngine_1.round2)(normalHours + sundayHours + holidayHours),
                    standardMonthlyHours: r.primarySite.standardMonthlyHours,
                    percentageOfStandard: (0, guardPayrollEngine_1.round2)(primaryHours / r.primarySite.standardMonthlyHours * 100),
                    hasAttendance: normalHours + sundayHours + holidayHours > 0, suggestedAmount: null };
            }) };
        return { run, records, attendance, partial, skipped: run.problems };
    }
    /**
     * Partial-run census for the run detail view: how many guards belong to the
     * run's site scope, how many of them are calculated, skipped, and simply not
     * included yet ("Calculate remaining" candidates). Read-only.
     */
    static async computePartial(run) {
        const { start, end } = monthWindow(run.periodKey);
        const guards = await Employee_1.Employee.find({ category: types_1.EmployeeCategory.GUARD, status: { $in: [types_1.EmployeeStatus.ACTIVE, types_1.EmployeeStatus.CONTRACTED] } }).select('_id').lean();
        const ids = guards.map((g) => g._id);
        const assignments = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: { $in: ids }, effectiveFrom: { $lte: end }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }] }).select('guardId siteId isPrimary').lean();
        const scopeSiteKey = run.scopeSiteId ? String(run.scopeSiteId) : null;
        const inScope = new Set();
        const byGuard = new Map();
        for (const a of assignments) {
            const key = String(a.guardId);
            if (!byGuard.has(key))
                byGuard.set(key, []);
            byGuard.get(key).push(a);
        }
        for (const g of guards) {
            const owned = byGuard.get(String(g._id)) || [];
            if (scopeSiteKey) {
                const primary = owned.find((a) => a.isPrimary && (a.siteId?._id || a.siteId).toString() === scopeSiteKey && (!a.effectiveTo || new Date(a.effectiveTo) >= start));
                if (primary)
                    inScope.add(String(g._id));
            }
            else {
                inScope.add(String(g._id));
            }
        }
        const allRecords = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).select('employeeId').lean();
        const recordIds = new Set(allRecords.map((r) => String(r.employeeId)));
        let calculated = 0;
        let missing = 0;
        for (const id of inScope) {
            if (recordIds.has(id))
                calculated += 1;
            else
                missing += 1;
        }
        const skipped = run.problems.filter((p) => inScope.has(String(p.employeeId))).length;
        return {
            scopeSiteId: scopeSiteKey,
            scopeSiteName: run.scopeSiteName || '',
            guardsInScope: inScope.size,
            calculated,
            skipped,
            missing,
            partial: missing > 0,
        };
    }
    static async getRecord(recordId) {
        if (!recordId || !mongoose_1.default.Types.ObjectId.isValid(recordId)) {
            throw ApiError_1.ApiError.badRequest(`Invalid record ID: "${recordId}"`);
        }
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
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
    /**
     * Re-check the run's status AFTER any async work at the exact moment of the
     * state-changing save. Closes the race where a run gets SUBMITTED/CHECKED/
     * APPROVED/PAID between the initial load and this save (two concurrent
     * lifecycle calls, or a parallel recalculate).
     */
    static async assertStatusAtSave(runId, allowed, action) {
        const fresh = await GuardPayrollRun_1.GuardPayrollRun.findById(runId).select('status').lean();
        if (!fresh)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        if (!allowed.includes(fresh.status)) {
            throw ApiError_1.ApiError.conflict(`Cannot ${action}: payroll moved to ${fresh.status} while the operation was in progress.`);
        }
    }
    /** CALCULATED → SUBMITTED. Locks attendance for the month. */
    static async submit(runId, userId, auditCtx) {
        return (0, payrollTransaction_1.payrollTransaction)(() => this.submitTransactional(runId, userId, auditCtx));
    }
    static async submitTransactional(runId, userId, auditCtx) {
        const run = await this.loadRun(runId);
        this.assertStatus(run, [types_1.PayrollRecordStatus.CALCULATED], 'submit');
        // Per-guard blockers (run.problems) are the saved skipped list: they do NOT
        // block submission. A partial run can move through the chain; the "Partial"
        // badge stays visible until every guard in scope has a record.
        run.problems = run.problems.filter((p) => !String(p.code).startsWith('NO_ADDITIONAL_SITE_COMPENSATION'));
        if (!run.totals.guards)
            throw ApiError_1.ApiError.badRequest('No guard payroll records to submit. Complete setup and attendance, then calculate payroll.');
        if (!run.inputFingerprint || run.inputFingerprint !== await this.inputFingerprint(run.periodKey)) {
            throw ApiError_1.ApiError.conflict('Payroll inputs changed since calculation. Review attendance, assignments, rates and deductions, then recalculate before submitting.');
        }
        await this.assertStatusAtSave(runId, [types_1.PayrollRecordStatus.CALCULATED], 'submit');
        run.status = types_1.PayrollRecordStatus.SUBMITTED;
        run.submittedBy = userId;
        run.submittedAt = new Date();
        await run.save();
        await this.log(userId, 'GUARD_PAYROLL_SUBMIT', run, auditCtx);
        return this.getRun(runId);
    }
    /** SUBMITTED → CHECKED. */
    static async check(runId, userId, auditCtx) {
        return (0, payrollTransaction_1.payrollTransaction)(() => this.checkTransactional(runId, userId, auditCtx));
    }
    static async checkTransactional(runId, userId, auditCtx) {
        const run = await this.loadRun(runId);
        this.assertStatus(run, [types_1.PayrollRecordStatus.SUBMITTED], 'check');
        await this.assertStatusAtSave(runId, [types_1.PayrollRecordStatus.SUBMITTED], 'check');
        run.status = types_1.PayrollRecordStatus.CHECKED;
        run.checkedBy = userId;
        run.checkedAt = new Date();
        await run.save();
        await this.log(userId, 'GUARD_PAYROLL_CHECK', run, auditCtx);
        return this.getRun(runId);
    }
    /** CHECKED → APPROVED. Settles loan/advance balances for the deductions taken. */
    static async approve(runId, userId, auditCtx) {
        return (0, payrollTransaction_1.payrollTransaction)(() => this.approveTransactional(runId, userId, auditCtx));
    }
    static async approveTransactional(runId, userId, auditCtx) {
        const run = await this.loadRun(runId);
        this.assertStatus(run, [types_1.PayrollRecordStatus.CHECKED], 'approve');
        await this.assertStatusAtSave(runId, [types_1.PayrollRecordStatus.CHECKED], 'approve');
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
        return (0, payrollTransaction_1.payrollTransaction)(() => this.returnTransactional(runId, reason, userId, auditCtx));
    }
    static async returnTransactional(runId, reason, userId, auditCtx) {
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
        if (!paymentRef?.trim())
            throw ApiError_1.ApiError.badRequest('A bank confirmation or reconciled payment reference is required. Exporting instructions does not confirm payment.');
        // Atomic conditional update: only flips APPROVED → PAID, and re-reads the
        // stored status at save time. A run that was recalculated/returned/re-paid
        // between load and save is rejected here instead of being paid twice.
        const paid = await GuardPayrollRun_1.GuardPayrollRun.findOneAndUpdate({ _id: runId, status: types_1.PayrollRecordStatus.APPROVED }, {
            $set: {
                status: types_1.PayrollRecordStatus.PAID,
                paidBy: userId,
                paidAt: new Date(),
                ...(paymentRef ? { paymentRef } : {}),
            },
        }, { new: true });
        if (!paid) {
            throw ApiError_1.ApiError.conflict(`Cannot mark paid: payroll is no longer APPROVED (concurrent change detected).`);
        }
        await this.log(userId, 'GUARD_PAYROLL_PAY', paid, auditCtx);
        return this.getRun(runId);
    }
    // ───────────────────────────────────────────────────────────────────
    // Exports & Payslips
    // ───────────────────────────────────────────────────────────────────
    /**
     * Every bank present in a combined staff + guard payroll month (deduped
     * from bank snapshots across StaffPayrollRecord + GuardPayrollRecord),
     * used to populate the export-menu bank list.
     */
    static async listBanksInUse(periodKey) {
        const q = periodKey ? { periodKey } : {};
        const [staff, guard] = await Promise.all([
            StaffPayrollRecord_1.StaffPayrollRecord.find(q).select('snapshot.bankName').lean(),
            GuardPayrollRecord_1.GuardPayrollRecord.find(q).select('snapshot.bankName').lean(),
        ]);
        const counts = new Map();
        for (const doc of [...staff, ...guard]) {
            const bank = doc.snapshot?.bankName?.trim() || 'CBE';
            counts.set(bank, (counts.get(bank) || 0) + 1);
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([bank, count]) => ({ bank, count }));
    }
    /** Export bank disbursement batch CSV (CBE / Awash / Dashen / All). */
    static async exportBankDisbursement(runId, bankFilter) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        this.assertStatus(run, [types_1.PayrollRecordStatus.APPROVED, types_1.PayrollRecordStatus.PAID], 'generate bank instructions');
        const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });
        const filtered = bankFilter && bankFilter !== 'ALL'
            ? records.filter((r) => (r.snapshot.bankName || '').toLowerCase().includes(bankFilter.toLowerCase()))
            : records;
        const invalid = filtered.filter((r) => !r.snapshot.bankName?.trim() || !r.snapshot.accountNumber?.trim() || !Number.isFinite(r.netPay) || r.netPay < 0);
        if (invalid.length)
            throw ApiError_1.ApiError.badRequest(`Correct bank details or invalid payable amounts before exporting: ${invalid.map((r) => r.snapshot.employeeCode).join(', ')}`);
        if (new Set(filtered.map((r) => r.employeeId.toString())).size !== filtered.length)
            throw ApiError_1.ApiError.conflict('Duplicate guard records detected in bank instructions.');
        const csvCell = (value) => `"${value.replace(/"/g, '""')}"`;
        const headers = ['Employee Code', 'Beneficiary Full Name', 'Bank Name', 'Account Number', 'Net Pay (ETB)', 'Reference', 'Narration'];
        const rows = filtered.map((r) => [
            csvCell(r.snapshot.employeeCode || ''),
            csvCell(r.snapshot.fullName || ''),
            csvCell(r.snapshot.bankName || ''),
            csvCell(r.snapshot.accountNumber || ''),
            r.netPay.toFixed(2),
            `"PAY-${run.periodKey}-${r.snapshot.employeeCode || ''}"`,
            `"Vital Security Guard Salary ${run.periodKey}"`,
        ]);
        return {
            filename: `guard-bank-disbursement-${run.periodKey}${bankFilter ? `-${bankFilter}` : ''}.csv`,
            csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
        };
    }
    /**
     * Statutory income tax schedule export — filtered by tax branch.
     * Guards declare under the private-organization schedule (branch 'GUARD');
     * office staff under the staff schedule ('STAFF').
     */
    static async exportTaxReport(runId, taxBranch) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        let records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });
        if (taxBranch && !['GUARD', 'STAFF', 'ALL'].includes(taxBranch))
            records = records.filter((r) => r.primarySite.taxCenter === taxBranch);
        // Snapshot-only view of which payable rows the run contains, grouped by
        // tax branch so per-branch exports stay self-describing.
        if (taxBranch === 'STAFF')
            throw ApiError_1.ApiError.badRequest('Use Staff Payroll for the staff income tax report; this run contains guards only.');
        const branchLabel = 'GUARD (Private Org Income Tax)';
        const headers = [
            'Tax Branch',
            'Employee Code',
            'Full Name',
            'Gross Salary (ETB)',
            'Non-Taxable Transport (ETB)',
            'Taxable Earnings (ETB)',
            'Tax Withheld (ETB)',
            'Period',
        ];
        const rows = records.map((r) => [
            `"${(r.primarySite.taxCenter || branchLabel).replace(/"/g, '""')}"`,
            r.snapshot.employeeCode || '',
            `"${(r.snapshot.fullName || '').replace(/"/g, '""')}"`,
            r.grossEarnings.toFixed(2),
            (r.primarySite.transportPaid || 0).toFixed(2),
            r.taxableEarnings.toFixed(2),
            r.incomeTax.toFixed(2),
            run.periodKey,
        ]);
        return {
            filename: `guard-tax-declaration-${taxBranch || 'ALL'}-${run.periodKey}.csv`,
            csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
        };
    }
    /**
     * Statutory pension schedule export — filtered by pension center.
     * Centers mirror the tax branch split: private-organization guards remit
     * via POESSA (Private Org), staff via their own scheme.
     */
    static async exportPensionReport(runId, pensionCenter) {
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
        if (!run)
            throw ApiError_1.ApiError.notFound('Guard payroll run not found');
        let records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id }).sort({ 'snapshot.employeeCode': 1 });
        if (pensionCenter && !['GUARD', 'STAFF', 'ALL'].includes(pensionCenter))
            records = records.filter((r) => r.primarySite.pensionCenter === pensionCenter);
        if (pensionCenter === 'STAFF')
            throw ApiError_1.ApiError.badRequest('Use Staff Payroll for the staff pension report; this run contains guards only.');
        const centerLabel = 'POESSA Private Organization (Guards)';
        const headers = [
            'Pension Center',
            'Employee Code',
            'Full Name',
            'Pension Enrolled',
            'Pension Base (ETB)',
            'Employee Contribution (ETB)',
            'Employer Contribution (ETB)',
            'Total Pension Remittance (ETB)',
            'Period',
        ];
        const rows = records.map((r) => [
            `"${(r.primarySite.pensionCenter || centerLabel).replace(/"/g, '""')}"`,
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
            filename: `guard-pension-${pensionCenter || 'ALL'}-${run.periodKey}.csv`,
            csv: [headers.join(','), ...rows.map((row) => row.join(','))].join('\n'),
        };
    }
    /** Formatted Official Payslip Document Data. */
    static async getPayslip(recordId) {
        const record = await this.getRecord(recordId);
        const run = await GuardPayrollRun_1.GuardPayrollRun.findById(record.runId);
        const saved = record.toObject();
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
                    ...saved.primarySite,
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
                additionalSites: saved.additionalSites.map((s) => ({
                    ...s,
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
                totalDeductions: (0, guardPayrollEngine_1.round2)(record.totalDeductions + record.employeePension + record.incomeTax),
            },
            taxableEarnings: record.taxableEarnings,
            pensionBase: record.pensionBase,
            paymentRef: run?.paymentRef,
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