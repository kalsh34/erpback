"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffPayrollController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const staffPayrollRun_service_1 = require("./staffPayrollRun.service");
const staffPayrollEntries_service_1 = require("./staffPayrollEntries.service");
const StaffPayrollRun_1 = require("../../models/StaffPayrollRun");
const StaffPayrollRecord_1 = require("../../models/StaffPayrollRecord");
const ApiError_1 = require("../../common/ApiError");
const auditCtx = (req) => ({ ip: req.ip, ua: req.get('user-agent') });
const userId = (req) => req.user?.userId || '';
/** STAFF PAYROLL v2 — contract-driven runs, overtime, bonus, lifecycle. */
class StaffPayrollController {
    // ── Status ─────────────────────────────────────────────────────────
    static async status(_req, res, next) {
        try {
            res.json({
                success: true,
                data: {
                    system: 'STAFF_PAYROLL',
                    version: 2,
                    state: 'ACTIVE',
                    message: 'Staff payroll v2 is active: contract-driven, formula-frozen, snapshot-based.',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Runs ───────────────────────────────────────────────────────────
    static async list(req, res, next) {
        try {
            const { periodKey, payrollPeriodId, runId } = req.query;
            let run = null;
            if (runId) {
                if (mongoose_1.default.Types.ObjectId.isValid(runId)) {
                    run = await StaffPayrollRun_1.StaffPayrollRun.findById(runId);
                }
            }
            else if (periodKey) {
                run = await StaffPayrollRun_1.StaffPayrollRun.findOne({ periodKey: periodKey });
            }
            else if (payrollPeriodId) {
                if (mongoose_1.default.Types.ObjectId.isValid(payrollPeriodId)) {
                    run = await StaffPayrollRun_1.StaffPayrollRun.findById(payrollPeriodId);
                }
                if (!run) {
                    run = await StaffPayrollRun_1.StaffPayrollRun.findOne({ periodKey: payrollPeriodId });
                }
            }
            if (!run) {
                run = await StaffPayrollRun_1.StaffPayrollRun.findOne().sort({ periodKey: -1 });
            }
            if (!run) {
                return res.json({ success: true, data: [], run: null });
            }
            const records = await StaffPayrollRecord_1.StaffPayrollRecord.find({ runId: run._id })
                .sort({ 'snapshot.employeeCode': 1 });
            const mapped = records.map((r) => ({
                ...r.toObject(),
                employeeId: {
                    _id: r.employeeId,
                    firstName: r.snapshot.fullName.split(' ')[0] || '',
                    lastName: r.snapshot.fullName.split(' ').slice(1).join(' ') || '',
                    employeeCode: r.snapshot.employeeCode,
                    department: r.snapshot.department,
                    position: r.snapshot.jobPosition,
                },
                basicSalary: r.snapshot.basic,
                responsibilityAllowance: r.snapshot.responsibilityAllowance,
                teleAllowance: r.snapshot.teleAllowance,
                taxableTransport: r.snapshot.taxableTransport,
                nonTaxableTransport: r.snapshot.nonTaxableTransport,
                overtime: r.overtimeAmount,
                regularOtHours: 0,
                holidayOtHours: 0,
                grossSalary: r.grossEarnings,
                taxableSalary: r.taxableEarnings,
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
            res.status(201).json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.calculate(periodKey, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async recalculateRun(req, res, next) {
        try {
            res.json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.recalculate(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async listRuns(req, res, next) {
        try {
            res.json({
                success: true,
                data: await staffPayrollRun_service_1.StaffPayrollRunService.listRuns({
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
            res.json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.getRun(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
    static async getRecord(req, res, next) {
        try {
            res.json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.getRecord(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Lifecycle ──────────────────────────────────────────────────────
    static async submitRun(req, res, next) {
        try {
            res.json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.submit(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async checkRun(req, res, next) {
        try {
            res.json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.check(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async approveRun(req, res, next) {
        try {
            res.json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.approve(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async returnRun(req, res, next) {
        try {
            res.json({
                success: true,
                data: await staffPayrollRun_service_1.StaffPayrollRunService.returnForCorrection(req.params.id, req.body.reason, userId(req), auditCtx(req)),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async payRun(req, res, next) {
        try {
            res.json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.markPaid(req.params.id, req.body?.paymentRef, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Overtime ───────────────────────────────────────────────────────
    static async listOvertime(req, res, next) {
        try {
            res.json({
                success: true,
                data: await staffPayrollEntries_service_1.StaffPayrollEntriesService.listOvertime({
                    periodKey: req.query.periodKey,
                    employeeId: req.query.employeeId,
                }),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async saveOvertime(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await staffPayrollEntries_service_1.StaffPayrollEntriesService.saveOvertime(req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async cancelOvertime(req, res, next) {
        try {
            res.json({ success: true, data: await staffPayrollEntries_service_1.StaffPayrollEntriesService.cancelOvertime(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Bonus (outside the formula) ────────────────────────────────────
    static async listBonuses(req, res, next) {
        try {
            res.json({
                success: true,
                data: await staffPayrollEntries_service_1.StaffPayrollEntriesService.listBonuses({
                    periodKey: req.query.periodKey,
                    employeeId: req.query.employeeId,
                }),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async saveBonus(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await staffPayrollEntries_service_1.StaffPayrollEntriesService.saveBonus(req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async cancelBonus(req, res, next) {
        try {
            res.json({ success: true, data: await staffPayrollEntries_service_1.StaffPayrollEntriesService.cancelBonus(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Exports & Payslip ──────────────────────────────────────────────
    static async exportBank(req, res, next) {
        try {
            const { bank } = req.query;
            const file = await staffPayrollRun_service_1.StaffPayrollRunService.exportBankDisbursement(req.params.id, bank);
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
            const file = await staffPayrollRun_service_1.StaffPayrollRunService.exportTaxReport(req.params.id);
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
            const file = await staffPayrollRun_service_1.StaffPayrollRunService.exportPensionReport(req.params.id);
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
            res.json({ success: true, data: await staffPayrollRun_service_1.StaffPayrollRunService.getPayslip(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.StaffPayrollController = StaffPayrollController;
//# sourceMappingURL=staffPayroll.controller.js.map