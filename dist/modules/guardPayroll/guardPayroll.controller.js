"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const guardPayrollRun_service_1 = require("./guardPayrollRun.service");
const guardPayrollConfig_service_1 = require("./guardPayrollConfig.service");
const siteCompensation_service_1 = require("./siteCompensation.service");
const GuardPayrollRun_1 = require("../../models/GuardPayrollRun");
const GuardPayrollRecord_1 = require("../../models/GuardPayrollRecord");
const ApiError_1 = require("../../common/ApiError");
const auditCtx = (req) => ({ ip: req.ip, ua: req.get('user-agent') });
const userId = (req) => req.user?.userId || '';
/** GUARD PAYROLL v2 — runs, records, site compensation, config, locks. */
class GuardPayrollController {
    // ── Status (kept from the skeleton) ────────────────────────────────
    static async status(_req, res, next) {
        try {
            res.json({
                success: true,
                data: {
                    system: 'GUARD_PAYROLL',
                    version: 2,
                    state: 'ACTIVE',
                    message: 'Guard payroll v2 is active: attendance-driven, site-by-site, snapshot-based.',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Config ─────────────────────────────────────────────────────────
    static async getConfig(_req, res, next) {
        try {
            res.json({ success: true, data: await guardPayrollConfig_service_1.GuardPayrollConfigService.get() });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateConfig(req, res, next) {
        try {
            res.json({ success: true, data: await guardPayrollConfig_service_1.GuardPayrollConfigService.update({ ...req.body, userId: userId(req) }) });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Site compensation ──────────────────────────────────────────────
    static async listCompensations(req, res, next) {
        try {
            const { siteId, currentOnly } = req.query;
            res.json({
                success: true,
                data: await siteCompensation_service_1.SiteCompensationService.listAll({
                    siteId: siteId,
                    currentOnly: currentOnly === 'true',
                }),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createCompensation(req, res, next) {
        try {
            const doc = await siteCompensation_service_1.SiteCompensationService.create({ ...req.body, userId: userId(req) });
            res.status(201).json({ success: true, data: doc });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteCompensation(req, res, next) {
        try {
            res.json({ success: true, data: await siteCompensation_service_1.SiteCompensationService.remove(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Runs & records ─────────────────────────────────────────────────
    static async list(req, res, next) {
        try {
            const { periodKey, payrollPeriodId, runId } = req.query;
            let run = null;
            if (runId) {
                if (mongoose_1.default.Types.ObjectId.isValid(runId)) {
                    run = await GuardPayrollRun_1.GuardPayrollRun.findById(runId);
                }
            }
            else if (periodKey) {
                run = await GuardPayrollRun_1.GuardPayrollRun.findOne({ periodKey: periodKey });
            }
            else if (payrollPeriodId) {
                if (mongoose_1.default.Types.ObjectId.isValid(payrollPeriodId)) {
                    run = await GuardPayrollRun_1.GuardPayrollRun.findById(payrollPeriodId);
                }
                if (!run) {
                    run = await GuardPayrollRun_1.GuardPayrollRun.findOne({ periodKey: payrollPeriodId });
                }
            }
            if (!run) {
                run = await GuardPayrollRun_1.GuardPayrollRun.findOne().sort({ periodKey: -1 });
            }
            if (!run) {
                return res.json({ success: true, data: [], run: null });
            }
            const records = await GuardPayrollRecord_1.GuardPayrollRecord.find({ runId: run._id })
                .populate('primarySite.siteId', 'siteName siteCode')
                .sort({ 'snapshot.employeeCode': 1 });
            const mapped = records.map((r) => ({
                ...r.toObject(),
                guardId: {
                    _id: r.employeeId,
                    firstName: r.snapshot.fullName.split(' ')[0] || '',
                    lastName: r.snapshot.fullName.split(' ').slice(1).join(' ') || '',
                    employeeCode: r.snapshot.employeeCode,
                },
                guardName: r.snapshot.fullName,
                period: r.periodKey,
                primarySiteId: {
                    _id: r.primarySite.siteId,
                    siteName: r.primarySite.siteName,
                },
                normalHours: r.primarySite.normalHours,
                otHours: r.primarySite.holidayHours + r.primarySite.sundayHours,
                regularOtHours: r.primarySite.sundayHours,
                holidayOtHours: r.primarySite.holidayHours,
                grossPay: r.grossEarnings,
                secondaryShiftPay: r.primarySite.transportPaid,
                status: run.status,
            }));
            res.json({ success: true, data: mapped, run });
        }
        catch (error) {
            next(error);
        }
    }
    static async createRun(req, res, next) {
        try {
            const periodKey = req.body?.periodKey || req.params?.periodKey;
            if (!periodKey)
                throw ApiError_1.ApiError.badRequest('periodKey (YYYY-MM) is required');
            res.status(201).json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.calculate(periodKey, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async recalculateRun(req, res, next) {
        try {
            const run = await guardPayrollRun_service_1.GuardPayrollRunService.getRun(req.params.id);
            res.json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.calculate(run.run.periodKey, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async listRuns(req, res, next) {
        try {
            res.json({
                success: true,
                data: await guardPayrollRun_service_1.GuardPayrollRunService.listRuns({
                    periodKey: req.query.periodKey,
                    status: req.query.status,
                }),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getRun(req, res, next) {
        try {
            res.json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.getRun(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
    static async getRecord(req, res, next) {
        try {
            res.json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.getRecord(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
    static async myPayroll(req, res, next) {
        try {
            res.json({
                success: true,
                data: await guardPayrollRun_service_1.GuardPayrollRunService.myPayroll(userId(req), req.query.periodKey),
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Lifecycle ──────────────────────────────────────────────────────
    static async submitRun(req, res, next) {
        try {
            res.json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.submit(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async checkRun(req, res, next) {
        try {
            res.json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.check(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async approveRun(req, res, next) {
        try {
            res.json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.approve(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async returnRun(req, res, next) {
        try {
            res.json({
                success: true,
                data: await guardPayrollRun_service_1.GuardPayrollRunService.returnForCorrection(req.params.id, req.body?.reason, userId(req), auditCtx(req)),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async payRun(req, res, next) {
        try {
            res.json({
                success: true,
                data: await guardPayrollRun_service_1.GuardPayrollRunService.markPaid(req.params.id, req.body?.paymentRef, userId(req), auditCtx(req)),
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Attendance lock (consumed by the attendance pages) ─────────────
    static async attendanceLock(req, res, next) {
        try {
            const { periodKey } = req.query;
            if (!periodKey)
                throw ApiError_1.ApiError.badRequest('periodKey (YYYY-MM) is required');
            res.json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.getAttendanceLock(periodKey) });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Exports & Payslip ──────────────────────────────────────────────
    static async exportBank(req, res, next) {
        try {
            const { bank } = req.query;
            const file = await guardPayrollRun_service_1.GuardPayrollRunService.exportBankDisbursement(req.params.id, bank);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
            res.send(file.csv);
        }
        catch (error) {
            next(error);
        }
    }
    static async exportTax(req, res, next) {
        try {
            const file = await guardPayrollRun_service_1.GuardPayrollRunService.exportTaxReport(req.params.id);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
            res.send(file.csv);
        }
        catch (error) {
            next(error);
        }
    }
    static async exportPension(req, res, next) {
        try {
            const file = await guardPayrollRun_service_1.GuardPayrollRunService.exportPensionReport(req.params.id);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
            res.send(file.csv);
        }
        catch (error) {
            next(error);
        }
    }
    static async getPayslip(req, res, next) {
        try {
            res.json({ success: true, data: await guardPayrollRun_service_1.GuardPayrollRunService.getPayslip(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GuardPayrollController = GuardPayrollController;
//# sourceMappingURL=guardPayroll.controller.js.map