"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollCalculationService = void 0;
const TaxBracket_1 = require("../../../models/TaxBracket");
const mongoose_1 = __importDefault(require("mongoose"));
const PensionRule_1 = require("../../../models/PensionRule");
const PayrollRate_1 = require("../../../models/PayrollRate");
const PrimarySiteAssignment_1 = require("../../../models/PrimarySiteAssignment");
const GuardSiteRate_1 = require("../../../models/GuardSiteRate");
const Site_1 = require("../../../models/Site");
const Contract_1 = require("../../../models/Contract");
const Employee_1 = require("../../../models/Employee");
const PayrollPeriod_1 = require("../../../models/PayrollPeriod");
const Loan_1 = require("../../../models/Loan");
const GuardPayrollRecord_1 = require("../../../models/GuardPayrollRecord");
const StaffPayrollRecord_1 = require("../../../models/StaffPayrollRecord");
const StaffAttendance_1 = require("../../../models/StaffAttendance");
const PayrollFormulaVersion_1 = require("../../../models/PayrollFormulaVersion");
const SalaryStructure_1 = require("../../../models/SalaryStructure");
const guardAttendance_service_1 = require("../guardAttendance/guardAttendance.service");
const ApiError_1 = require("../../../common/ApiError");
const dateUtils_1 = require("../../../common/dateUtils");
const types_1 = require("../../../types");
/**
 * Expected monthly hours for guards (spec §7: use EXISTING configuration —
 * this is the value the assignments/seed already carry; never silently 240).
 * Per-assignment `standardMonthlyHours` takes priority when present.
 */
const DEFAULT_EXPECTED_MONTHLY_HOURS = 240;
function round2(n) {
    return Math.round(n * 100) / 100;
}
class PayrollCalculationService {
    static async calculateIncomeTax(taxableSalary, effectiveDate = new Date()) {
        const bracket = await TaxBracket_1.TaxBracket.findOne({
            isCurrent: true,
            effectiveFrom: { $lte: effectiveDate },
            $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: effectiveDate } }],
        }).sort({ effectiveFrom: -1 });
        if (!bracket)
            throw ApiError_1.ApiError.internal('No active tax bracket found');
        for (const b of bracket.brackets) {
            const max = b.max ?? Infinity;
            if (taxableSalary >= b.min && taxableSalary <= max) {
                return Math.max(0, (taxableSalary * b.rate) - b.deduction);
            }
        }
        return 0;
    }
    static async calculatePension(baseAmount, effectiveDate = new Date()) {
        const rule = await PensionRule_1.PensionRule.findOne({
            isCurrent: true,
            effectiveFrom: { $lte: effectiveDate },
            $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: effectiveDate } }],
        }).sort({ effectiveFrom: -1 });
        if (!rule)
            throw ApiError_1.ApiError.internal('No active pension rule found');
        return {
            employeePension: Math.round(baseAmount * rule.employeeRate * 100) / 100,
            employerPension: Math.round(baseAmount * rule.employerRate * 100) / 100,
            pensionTaxBase: rule.pensionTaxBase || 'NORMAL_SALARY_ONLY',
        };
    }
    static async getCurrentFormula(asOf = new Date()) {
        const formula = await PayrollFormulaVersion_1.PayrollFormulaVersion.findOne({
            isCurrent: true,
            effectiveFrom: { $lte: asOf },
            $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: asOf } }],
        }).sort({ effectiveFrom: -1 });
        if (!formula)
            throw ApiError_1.ApiError.internal('No active payroll formula version found. Create one under Admin > Payroll Config.');
        return formula;
    }
    static async getActiveSalaryStructure(employeeType, asOf = new Date()) {
        return SalaryStructure_1.SalaryStructure.findOne({
            employeeType,
            isCurrent: true,
            effectiveFrom: { $lte: asOf },
            $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: asOf } }],
        }).sort({ effectiveFrom: -1 });
    }
    static getComponentValue(record, code) {
        const fieldMap = {
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
        if (field && record[field] !== undefined)
            return record[field];
        return 0;
    }
    /**
     * Resolve the effective earning rate for a guard's PRIMARY site (spec §7).
     * Primary rate = contract salary ÷ expected monthly hours (assignment config
     * first, DEFAULT_EXPECTED_MONTHLY_HOURS fallback). Multipliers for OT/holiday
     * come from the active salary structure.
     */
    static async resolveGuardRates(guardId, assignment, asOf = new Date()) {
        const activeContract = await Contract_1.Contract.findOne({ employeeId: guardId, status: 'ACTIVE' });
        const expectedMonthlyHours = assignment && assignment.standardMonthlyHours > 0
            ? assignment.standardMonthlyHours
            : DEFAULT_EXPECTED_MONTHLY_HOURS;
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
        // 1) Contract monthly salary ÷ expected monthly hours (spec §7).
        // NOTE: the quotient is kept at full precision — rounding the rate first
        // would make 8000/240 × 210 = 6,999.30 instead of the required 7,000.00;
        // rounding happens at the earnings level (round2).
        if (activeContract && activeContract.wage > 0) {
            normalRate = activeContract.wage / expectedMonthlyHours;
        }
        // 2) Per-site assignment hourly rate (already hourly — used directly)
        if (normalRate === 0 && assignment && typeof assignment.hourlyRate === 'number' && assignment.hourlyRate > 0) {
            normalRate = assignment.hourlyRate;
        }
        // 3) Salary structure default monthly BASIC ÷ expected monthly hours
        if (normalRate === 0 && structure) {
            const basicEarning = structure.earnings.find((e) => e.componentCode === 'BASIC');
            if (basicEarning && basicEarning.defaultRate > 0) {
                normalRate = basicEarning.defaultRate / expectedMonthlyHours;
            }
        }
        // 4) PayrollRate fallback (absolute hourly rates for a period)
        if (normalRate === 0) {
            const fallback = await PayrollRate_1.PayrollRate.findOne({}).sort({ createdAt: -1 });
            if (fallback) {
                normalRate = fallback.normalRate;
                otRate = fallback.otRate;
                holidayRate = fallback.holidayRate;
                holidayOtRate = round2(fallback.normalRate * holidayOtMultiplier);
                return {
                    normalRate, otRate, holidayRate, holidayOtRate,
                    standardMonthlyHours: expectedMonthlyHours,
                    expectedMonthlyHours,
                    contractSalary: activeContract?.wage || 0,
                    pensionEnrolled: activeContract ? activeContract.pensionEnrolled !== false : true,
                };
            }
        }
        otRate = round2(normalRate * otMultiplier);
        holidayRate = round2(normalRate * holidayMultiplier);
        holidayOtRate = round2(normalRate * holidayOtMultiplier);
        return {
            normalRate, otRate, holidayRate, holidayOtRate,
            standardMonthlyHours: expectedMonthlyHours,
            expectedMonthlyHours,
            contractSalary: activeContract?.wage || 0,
            pensionEnrolled: activeContract ? activeContract.pensionEnrolled !== false : true,
        };
    }
    /**
     * The guard's Primary Site assignment in effect during the payroll period.
     * The `isPrimary` flag on the assignment wins (Operations can change it);
     * otherwise the most recent overlapping `effectiveFrom` decides (spec §11/§14).
     */
    static async getPeriodPrimaryAssignment(guardId, periodStart, periodEnd) {
        const list = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({
            guardId,
            effectiveFrom: { $lte: periodEnd },
            $or: [
                { effectiveTo: { $exists: false } },
                { effectiveTo: null },
                { effectiveTo: { $gte: periodStart } },
            ],
        }).sort({ isPrimary: -1, effectiveFrom: -1 });
        return list[0] || null;
    }
    /**
     * Build the per-site earnings breakdown for a guard over a payroll period
     * (spec §2/§4): hours grouped BY SITE from validated daily attendance —
     * Guard → Site → Month → Total Hours. The primary site is always present
     * (flagged `isPrimary`) even when it has no hours yet, priced at the
     * contract rate; additional sites are priced at their GuardSiteRate
     * (flagged rateMissing when Finance has not entered one yet).
     */
    static async buildSiteEarnings(opts) {
        const { guardId, payrollPeriodId, primarySiteId } = opts;
        const validationErrors = [];
        const groups = new Map();
        const primaryKey = primarySiteId ? primarySiteId.toString() : null;
        if (primaryKey && !groups.has(primaryKey)) {
            groups.set(primaryKey, { normalHours: 0, holidayHours: 0 });
        }
        // Site-level attendance totals for the period (ACTIVE records only).
        const attendanceTotals = await guardAttendance_service_1.GuardAttendanceService.getSiteHoursForPeriod(opts.periodStart, opts.periodEnd, guardId);
        for (const row of attendanceTotals) {
            const key = row.siteId;
            const bucket = groups.get(key) || { normalHours: 0, holidayHours: 0 };
            bucket.normalHours = Math.round((bucket.normalHours + row.normalHours) * 100) / 100;
            bucket.holidayHours = Math.round((bucket.holidayHours + row.holidayHours) * 100) / 100;
            groups.set(key, bucket);
        }
        const siteIds = Array.from(groups.keys()).map((k) => new mongoose_1.default.Types.ObjectId(k));
        const [sites, rates] = await Promise.all([
            siteIds.length ? Site_1.Site.find({ _id: { $in: siteIds } }).select('siteName') : Promise.resolve([]),
            siteIds.length
                ? GuardSiteRate_1.GuardSiteRate.find({ guardId, payrollPeriodId, siteId: { $in: siteIds } })
                : Promise.resolve([]),
        ]);
        const siteNameById = new Map();
        sites.forEach((s) => siteNameById.set(s._id.toString(), s.siteName));
        const rateBySiteId = new Map();
        rates.forEach((r) => rateBySiteId.set(r.siteId.toString(), r));
        const siteEarnings = [];
        let rateMissing = false;
        groups.forEach((hours, key) => {
            const isPrimary = key === primaryKey;
            let normalRate;
            let holidayRate;
            let siteRateMissing = false;
            if (isPrimary) {
                normalRate = opts.primaryNormalRate;
                holidayRate = opts.primaryHolidayRate;
            }
            else {
                const rate = rateBySiteId.get(key);
                if (rate) {
                    normalRate = rate.normalRate;
                    holidayRate = rate.holidayRate;
                }
                else {
                    normalRate = 0;
                    holidayRate = 0;
                    siteRateMissing = true;
                    rateMissing = true;
                }
            }
            siteEarnings.push({
                siteId: isPrimary ? primarySiteId : new mongoose_1.default.Types.ObjectId(key),
                siteName: siteNameById.get(key),
                isPrimary,
                normalHours: round2(hours.normalHours),
                holidayHours: round2(hours.holidayHours),
                normalRate,
                holidayRate,
                normalEarnings: round2(hours.normalHours * normalRate),
                holidayEarnings: round2(hours.holidayHours * holidayRate),
                rateMissing: siteRateMissing,
            });
        });
        // Primary first, then alphabetical — stable, review-friendly order
        siteEarnings.sort((a, b) => {
            if (a.isPrimary !== b.isPrimary)
                return a.isPrimary ? -1 : 1;
            return String(a.siteName || '').localeCompare(String(b.siteName || ''));
        });
        return { siteEarnings, validationErrors, rateMissing };
    }
    /** Contract allowances, paid ONCE per period — never × sites or hours (spec §8). */
    static buildGuardAllowances(contract, assignment) {
        const allowances = [];
        if (!contract)
            return allowances;
        if (contract.responsibilityAllowance > 0) {
            allowances.push({ label: 'Responsibility Allowance', amount: contract.responsibilityAllowance, taxable: true });
        }
        if (contract.teleAllowance > 0) {
            allowances.push({ label: 'Tele Allowance', amount: contract.teleAllowance, taxable: true });
        }
        if (contract.taxableTransport > 0) {
            allowances.push({ label: 'Taxable Transport', amount: contract.taxableTransport, taxable: true });
        }
        if (contract.nonTaxableAllowance > 0) {
            allowances.push({ label: 'Non-Taxable Allowance', amount: contract.nonTaxableAllowance, taxable: false });
        }
        const transport = contract.transportAllowance > 0
            ? contract.transportAllowance
            : (assignment?.transportAllowance || 0);
        if (transport > 0) {
            allowances.push({ label: 'Transport Allowance', amount: transport, taxable: true });
        }
        return allowances;
    }
    static async calculateGuardPayroll(recordId) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId)
            .populate('guardId')
            .populate('primarySiteId');
        if (!record)
            throw ApiError_1.ApiError.notFound('Guard payroll record not found');
        // Resolve time-sensitive config against the payroll period, not wall-clock
        // time, so recalculating an old period after a rule change does not
        // reprice history.
        const periodId = record.payrollPeriodId?._id || record.payrollPeriodId;
        const period = await PayrollPeriod_1.PayrollPeriod.findById(periodId);
        const asOf = period?.endDate || new Date();
        const periodStart = period?.startDate || asOf;
        const periodEnd = period?.endDate || asOf;
        const guardId = record.guardId?._id || record.guardId;
        const contract = await Contract_1.Contract.findOne({ employeeId: guardId, status: 'ACTIVE' });
        // Legacy records (pre site-breakdown) have no siteEarnings — rebuild them
        // from the period's primary assignment so every record flows through the
        // site-aware engine.
        if (!record.siteEarnings || record.siteEarnings.length === 0) {
            const assignment = await this.getPeriodPrimaryAssignment(guardId, periodStart, periodEnd);
            const rebuilt = await this.buildSiteEarnings({
                guardId,
                periodStart,
                periodEnd,
                payrollPeriodId: periodId,
                primarySiteId: record.primarySiteId || assignment?.siteId || null,
                primaryNormalRate: record.normalRate || 0,
                primaryHolidayRate: record.holidayRate || 0,
            });
            record.siteEarnings = rebuilt.siteEarnings;
            record.rateMissing = rebuilt.rateMissing;
            record.validationErrors = [
                ...(record.validationErrors || []).filter((e) => !e.includes('site assignment')),
                ...rebuilt.validationErrors,
            ];
            if (!record.primarySiteId && assignment?.siteId)
                record.primarySiteId = assignment.siteId;
        }
        else if (record.rateMissing) {
            // Finance may have entered the missing rates since generation — re-resolve
            // before recalculating so fixing rates is enough (no regeneration needed).
            const missing = record.siteEarnings.filter((e) => e.rateMissing);
            const rates = missing.length
                ? await GuardSiteRate_1.GuardSiteRate.find({
                    guardId,
                    payrollPeriodId: periodId,
                    siteId: { $in: missing.map((e) => e.siteId) },
                })
                : [];
            const rateByKey = new Map();
            rates.forEach((r) => rateByKey.set(r.siteId.toString(), r));
            missing.forEach((e) => {
                const rate = e.siteId ? rateByKey.get(e.siteId.toString()) : null;
                if (rate) {
                    e.normalRate = rate.normalRate;
                    e.holidayRate = rate.holidayRate;
                    e.rateMissing = false;
                }
            });
            record.rateMissing = record.siteEarnings.some((e) => e.rateMissing);
            if (!record.rateMissing) {
                record.validationErrors = (record.validationErrors || []).filter((e) => !e.includes('rate'));
            }
        }
        // Reprice every site from its own hours × its own rate (spec §4).
        record.siteEarnings.forEach((e) => {
            e.normalEarnings = round2(e.normalHours * e.normalRate);
            e.holidayEarnings = round2(e.holidayHours * e.holidayRate);
        });
        const primary = record.siteEarnings.find((e) => e.isPrimary);
        const primaryNormalEarnings = primary ? primary.normalEarnings : 0;
        const primaryHolidayEarnings = primary ? primary.holidayEarnings : 0;
        const primaryEarnings = round2(primaryNormalEarnings + primaryHolidayEarnings);
        const additionalEarnings = round2(record.siteEarnings.filter((e) => !e.isPrimary).reduce((s, e) => s + e.normalEarnings + e.holidayEarnings, 0));
        const allowanceTotal = round2((record.allowances || []).reduce((s, a) => s + a.amount, 0));
        const nonTaxableAllowances = round2((record.allowances || []).filter((a) => !a.taxable).reduce((s, a) => s + a.amount, 0));
        // OT stays priced at the primary-site multipliers (manual hours entry).
        const regularOtPay = round2(record.regularOtHours * record.otRate);
        const holidayOtRate = record.holidayOtRate && record.holidayOtRate > 0
            ? record.holidayOtRate
            : round2(record.normalRate * 2.5);
        const holidayOtPay = round2(record.holidayOtHours * holidayOtRate);
        // Spec §18: gross = primary + additional site earnings + allowances + OT.
        const grossEarnings = round2(primaryEarnings + additionalEarnings + allowanceTotal + regularOtPay + holidayOtPay);
        // Spec §18: tax from combined earnings (non-taxable allowances excluded),
        // calculated BEFORE pension.
        const taxableEarnings = Math.max(0, round2(grossEarnings - nonTaxableAllowances));
        const incomeTax = await this.calculateIncomeTax(taxableEarnings, asOf);
        // Spec §19: pension ONLY on the primary/base component (primary site normal
        // earnings) — never on additional-site earnings, allowances or OT.
        const pensionEnrolled = contract ? contract.pensionEnrolled !== false : true;
        const pension = pensionEnrolled
            ? await this.calculatePension(primaryNormalEarnings, asOf)
            : { employeePension: 0, employerPension: 0, pensionTaxBase: types_1.PensionTaxBase.NORMAL_SALARY_ONLY };
        const totalDeductions = round2(incomeTax + pension.employeePension + record.loanDeduction);
        const netPay = round2(grossEarnings - totalDeductions);
        // ── Persist: canonical fields + legacy mirrors (journal compatibility) ──
        record.normalHours = round2(record.siteEarnings.reduce((s, e) => s + e.normalHours, 0));
        record.holidayHours = round2(record.siteEarnings.reduce((s, e) => s + e.holidayHours, 0));
        record.normalSalary = round2(record.standardMonthlyHours * record.normalRate);
        record.workedSalary = primaryNormalEarnings;
        record.regularOtPay = regularOtPay;
        record.holidayOtPay = holidayOtPay;
        record.holidayPay = primaryHolidayEarnings;
        record.secondaryShiftPay = additionalEarnings;
        record.primaryEarnings = primaryEarnings;
        record.additionalEarnings = additionalEarnings;
        record.allowanceTotal = allowanceTotal;
        record.nonTaxableAllowances = nonTaxableAllowances;
        record.grossEarnings = grossEarnings;
        record.grossPay = grossEarnings;
        record.baseComponent = primaryNormalEarnings;
        record.employeePension = pension.employeePension;
        record.employerPension = pension.employerPension;
        record.incomeTax = round2(incomeTax);
        record.totalDeductions = totalDeductions;
        record.netPay = netPay;
        record.rateMissing = record.siteEarnings.some((e) => e.rateMissing);
        record.snapshot = {
            contractSalary: record.contractSalary,
            expectedMonthlyHours: record.expectedMonthlyHours,
            primaryHourlyRate: record.normalRate,
            primarySiteId: record.primarySiteId ? String(record.primarySiteId._id || record.primarySiteId) : null,
            pensionEnrolled,
            sites: record.siteEarnings.map((e) => ({
                siteId: e.siteId ? String(e.siteId) : null,
                siteName: e.siteName,
                isPrimary: e.isPrimary,
                normalHours: e.normalHours,
                holidayHours: e.holidayHours,
                normalRate: e.normalRate,
                holidayRate: e.holidayRate,
            })),
            allowances: record.allowances,
            ot: {
                regularOtHours: record.regularOtHours,
                holidayOtHours: record.holidayOtHours,
                otRate: record.otRate,
                holidayOtRate,
            },
            loanDeduction: record.loanDeduction,
            taxableEarnings,
            configAsOf: asOf,
        };
        // Fresh calculation invalidates any previous manual override (spec §21).
        record.overrides = [];
        record.calculatedGrossPay = undefined;
        record.calculatedNetPay = undefined;
        record.status = types_1.PayrollRecordStatus.CALCULATED;
        record.calculatedAt = new Date();
        await record.save();
        return record;
    }
    static async calculateStaffPayroll(recordId) {
        const record = await StaffPayrollRecord_1.StaffPayrollRecord.findById(recordId)
            .populate('employeeId');
        if (!record)
            throw ApiError_1.ApiError.notFound('Staff payroll record not found');
        // Resolve time-sensitive config against the payroll period, not wall-clock time.
        const staffPeriodId = record.payrollPeriodId?._id || record.payrollPeriodId;
        const staffPeriod = staffPeriodId ? await PayrollPeriod_1.PayrollPeriod.findById(staffPeriodId) : null;
        const staffAsOf = staffPeriod?.endDate || new Date();
        // populate() returns null when the employee document was deleted — fail
        // with a clear 400 instead of a TypeError 500 on the dereference below.
        const employeeRef = record.employeeId;
        const employeeId = employeeRef?._id || employeeRef;
        if (!employeeId) {
            throw ApiError_1.ApiError.badRequest('Cannot calculate: the employee linked to this payroll record no longer exists.');
        }
        const activeContract = await Contract_1.Contract.findOne({
            employeeId,
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
            const otStructure = await SalaryStructure_1.SalaryStructure.findById(activeContract.salaryStructureId);
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
        let deductionCodes = [];
        let otCountedInGross = false;
        if (activeContract?.salaryStructureId) {
            const structure = await SalaryStructure_1.SalaryStructure.findById(activeContract.salaryStructureId);
            if (structure) {
                for (const earning of structure.earnings) {
                    // BONUS lives outside the formula (post-net, untaxed, unpensioned) —
                    // it must never enter gross or taxable even if a structure lists it.
                    if (earning.componentCode === 'BONUS')
                        continue;
                    const value = this.getComponentValue(record, earning.componentCode);
                    grossSalary += value;
                    if (earning.taxable)
                        taxableSalary += value;
                    if (earning.componentCode === 'OT')
                        otCountedInGross = true;
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
                if (code === 'BONUS')
                    continue;
                grossSalary += this.getComponentValue(record, code);
                if (code === 'OT')
                    otCountedInGross = true;
            }
            for (const code of formula.taxableComponentCodes) {
                if (code === 'BONUS')
                    continue;
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
            if (code === 'INCOME_TAX' || code === 'EMPLOYEE_PENSION')
                continue;
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
        // Fresh calculation invalidates any previous manual override.
        record.overrides = [];
        record.calculatedGrossSalary = undefined;
        record.calculatedNetPay = undefined;
        record.status = types_1.PayrollRecordStatus.CALCULATED;
        record.calculatedAt = new Date();
        await record.save();
        return record;
    }
    /**
     * Total loan deduction for an employee as of a date.
     * Respects: loan status ACTIVE, startDate, optional endDate, and remaining balance
     * (never deducts more than what is still owed).
     */
    static async getActiveLoanDeduction(employeeId, asOf) {
        const loans = await Loan_1.Loan.find({
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
    static async applyLoanRepayment(employeeId, amount, asOf) {
        if (!amount || amount <= 0)
            return;
        const loans = await Loan_1.Loan.find({
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
            if (remaining <= 0)
                break;
            const balance = typeof loan.balance === 'number' ? loan.balance : loan.monthlyDeduction;
            const applied = Math.min(remaining, Math.max(0, balance));
            if (applied <= 0)
                continue;
            loan.paidAmount = Math.round(((loan.paidAmount || 0) + applied) * 100) / 100;
            loan.balance = Math.round((balance - applied) * 100) / 100;
            if (loan.balance <= 0) {
                loan.balance = 0;
                loan.status = types_1.LoanStatus.PAID_OFF;
            }
            await loan.save();
            remaining = Math.round((remaining - applied) * 100) / 100;
        }
    }
    static async generateGuardPayrollRecords(payrollPeriodId) {
        const period = await PayrollPeriod_1.PayrollPeriod.findById(payrollPeriodId);
        if (!period)
            throw ApiError_1.ApiError.notFound('Payroll period not found');
        // Generate for ALL active guards (developer decision: every guard gets a
        // payroll record even with problems — validationErrors surface the gaps
        // and block submission until fixed).
        const guards = await Employee_1.Employee.find({
            category: 'GUARD',
            status: { $in: ['ACTIVE', 'CONTRACTED'] },
        });
        const records = [];
        for (const guard of guards) {
            const existing = await GuardPayrollRecord_1.GuardPayrollRecord.findOne({
                payrollPeriodId,
                guardId: guard._id,
            });
            if (existing)
                continue;
            const validationErrors = [];
            const contract = await Contract_1.Contract.findOne({ employeeId: guard._id, status: 'ACTIVE' });
            if (!contract)
                validationErrors.push('No active contract for this period.');
            const assignment = await this.getPeriodPrimaryAssignment(guard._id, period.startDate, period.endDate);
            if (!assignment)
                validationErrors.push('No primary site assignment for this period.');
            const rates = await this.resolveGuardRates(guard._id, assignment, period.endDate || new Date());
            const primarySiteId = assignment ? assignment.siteId : null;
            const built = await this.buildSiteEarnings({
                guardId: guard._id,
                periodStart: period.startDate,
                periodEnd: period.endDate,
                payrollPeriodId,
                primarySiteId,
                primaryNormalRate: rates.normalRate,
                primaryHolidayRate: rates.holidayRate,
            });
            validationErrors.push(...built.validationErrors);
            const allowances = this.buildGuardAllowances(contract, assignment);
            const allowanceTotal = round2(allowances.reduce((s, a) => s + a.amount, 0));
            const nonTaxableAllowances = round2(allowances.filter((a) => !a.taxable).reduce((s, a) => s + a.amount, 0));
            const primary = built.siteEarnings.find((e) => e.isPrimary);
            const primaryEarnings = primary ? round2(primary.normalEarnings + primary.holidayEarnings) : 0;
            const additionalEarnings = round2(built.siteEarnings.filter((e) => !e.isPrimary).reduce((s, e) => s + e.normalEarnings + e.holidayEarnings, 0));
            const loanDeduction = await this.getActiveLoanDeduction(guard._id, period.endDate || new Date());
            const record = await GuardPayrollRecord_1.GuardPayrollRecord.create({
                payrollPeriodId,
                guardId: guard._id,
                primarySiteId,
                standardMonthlyHours: rates.standardMonthlyHours,
                expectedMonthlyHours: rates.expectedMonthlyHours,
                contractSalary: rates.contractSalary,
                primaryHourlyRate: rates.normalRate,
                normalHours: round2(built.siteEarnings.reduce((s, e) => s + e.normalHours, 0)),
                otHours: 0,
                holidayHours: round2(built.siteEarnings.reduce((s, e) => s + e.holidayHours, 0)),
                normalRate: rates.normalRate,
                otRate: rates.otRate,
                holidayRate: rates.holidayRate,
                holidayOtRate: rates.holidayOtRate,
                siteEarnings: built.siteEarnings,
                primaryEarnings,
                additionalEarnings,
                secondaryShiftPay: additionalEarnings,
                allowances,
                allowanceTotal,
                nonTaxableAllowances,
                rateMissing: built.rateMissing,
                validationErrors,
                loanDeduction,
                status: types_1.PayrollRecordStatus.DRAFT,
            });
            // NOTE: the loan deduction above is only a snapshot for review. The actual
            // Loan.balance / paidAmount mutation happens in confirmPaid (see
            // GuardPayrollService.confirmPaid), so abandoned drafts never move money.
            records.push(record);
        }
        return records;
    }
    /**
     * Payable-day calendar (spec §5): Mon–Fri = 1, Sat = 0.5, Sun = 0.
     * No hardcoded 22/26/30 divisors anywhere.
     */
    static calendarDayValue(d) {
        const dow = d.getDay();
        if (dow === 0)
            return 0;
        if (dow === 6)
            return 0.5;
        return 1;
    }
    /** Status → payable value for a day, capped at the calendar value. */
    static statusDayValue(status, calendarValue) {
        switch (status) {
            case types_1.StaffAttendanceStatus.ABSENT:
            case types_1.StaffAttendanceStatus.UNPAID_LEAVE:
                return 0;
            case types_1.StaffAttendanceStatus.HALF_DAY:
                return Math.min(0.5, calendarValue);
            default:
                // PRESENT / PAID_LEAVE / SICK_LEAVE / HOLIDAY / WEEKEND → calendar value
                return calendarValue;
        }
    }
    static async generateStaffPayrollRecords(payrollPeriodId) {
        const period = await PayrollPeriod_1.PayrollPeriod.findById(payrollPeriodId);
        if (!period)
            throw ApiError_1.ApiError.notFound('Payroll period not found');
        if (period.status !== 'LOCKED') {
            throw ApiError_1.ApiError.badRequest('Staff attendance for this period has not been locked yet. Please ask HR to lock attendance before generating payroll.');
        }
        const staff = await Employee_1.Employee.find({ category: 'OFFICE_STAFF', status: { $in: ['ACTIVE', 'CONTRACTED'] } });
        const records = [];
        const skipped = [];
        // Payable-day calendar over the period's 26th→25th range. Attendance rows
        // are tagged by calendar month, so we query BY DATE to collect the range
        // (this also works unchanged for legacy 1st→30th periods).
        const startStr = (0, dateUtils_1.ymdLocal)(period.startDate);
        const endStr = (0, dateUtils_1.ymdLocal)(period.endDate);
        const expectedDays = [];
        for (let d = new Date(period.startDate); d <= period.endDate; d = (0, dateUtils_1.nextLocalMidnight)(d)) {
            expectedDays.push(this.calendarDayValue(d));
        }
        const expectedPayable = round2(expectedDays.reduce((s, v) => s + v, 0));
        for (const employee of staff) {
            const existing = await StaffPayrollRecord_1.StaffPayrollRecord.findOne({ payrollPeriodId, employeeId: employee._id });
            if (existing)
                continue;
            const periodEnd = period.endDate || new Date();
            const activeContract = await Contract_1.Contract.findOne({
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
                    employeeId: employee._id.toString(),
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
            // Rows for THIS period's date range regardless of calendar-month tag
            // (days 26–31 belong to the next period's payroll window).
            const attendanceRows = await StaffAttendance_1.StaffAttendance.find({
                employeeId: employee._id,
                date: { $gte: startStr, $lte: endStr },
            });
            const rowByDate = new Map();
            attendanceRows.forEach((r) => rowByDate.set(r.date, r.status));
            let attendanceDataMissing = false;
            let actualPayable = 0;
            let i = 0;
            for (let d = new Date(period.startDate); d <= period.endDate; d = (0, dateUtils_1.nextLocalMidnight)(d), i++) {
                const cal = expectedDays[i];
                const status = rowByDate.get((0, dateUtils_1.ymdLocal)(d));
                if (status === undefined) {
                    // No row for this day: pay the full calendar value, flag the gap —
                    // never silently deduct for missing attendance data.
                    actualPayable += cal;
                    attendanceDataMissing = true;
                }
                else {
                    actualPayable += this.statusDayValue(status, cal);
                }
            }
            actualPayable = round2(actualPayable);
            // Spec §5: salary × actual payable ÷ expected payable — no /22 divisor.
            const basicSalary = expectedPayable > 0
                ? round2(baseSalary * actualPayable / expectedPayable)
                : round2(baseSalary);
            const loanDeduction = await this.getActiveLoanDeduction(employee._id, period.endDate || new Date());
            const record = await StaffPayrollRecord_1.StaffPayrollRecord.create({
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
                expectedPayableDays: expectedPayable,
                actualPayableDays: actualPayable,
                status: types_1.PayrollRecordStatus.DRAFT,
            });
            // NOTE: the loan deduction above is only a snapshot for review. The actual
            // Loan.balance / paidAmount mutation happens in confirmPaid (see
            // StaffPayrollService.confirmPaid), so abandoned drafts never move money.
            records.push(record);
        }
        return { records, skipped };
    }
}
exports.PayrollCalculationService = PayrollCalculationService;
//# sourceMappingURL=payrollCalculation.service.js.map