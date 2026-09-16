"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollConfigController = void 0;
const payrollConfig_service_1 = require("./payrollConfig.service");
class PayrollConfigController {
    // ── Components ──
    static async getComponents(req, res, next) {
        try {
            const components = await payrollConfig_service_1.PayrollConfigService.getComponents(req.query.includeInactive === 'true');
            res.json({ success: true, data: components });
        }
        catch (err) {
            next(err);
        }
    }
    static async getComponentById(req, res, next) {
        try {
            const comp = await payrollConfig_service_1.PayrollConfigService.getComponentById(req.params.id);
            res.json({ success: true, data: comp });
        }
        catch (err) {
            next(err);
        }
    }
    static async createComponent(req, res, next) {
        try {
            const comp = await payrollConfig_service_1.PayrollConfigService.createComponent(req.body, {
                userId: req.user.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: comp });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateComponent(req, res, next) {
        try {
            const comp = await payrollConfig_service_1.PayrollConfigService.updateComponent(req.params.id, req.body, {
                userId: req.user.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: comp });
        }
        catch (err) {
            next(err);
        }
    }
    static async retireComponent(req, res, next) {
        try {
            const comp = await payrollConfig_service_1.PayrollConfigService.retireComponent(req.params.id, {
                userId: req.user.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: comp });
        }
        catch (err) {
            next(err);
        }
    }
    // ── Formulas ──
    static async getCurrentFormula(req, res, next) {
        try {
            const formula = await payrollConfig_service_1.PayrollConfigService.getCurrentFormula();
            res.json({ success: true, data: formula });
        }
        catch (err) {
            next(err);
        }
    }
    static async getFormulaVersion(req, res, next) {
        try {
            const formula = await payrollConfig_service_1.PayrollConfigService.getFormulaVersion(parseInt(req.params.version));
            res.json({ success: true, data: formula });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAllFormulas(req, res, next) {
        try {
            const formulas = await payrollConfig_service_1.PayrollConfigService.getAllFormulas();
            res.json({ success: true, data: formulas });
        }
        catch (err) {
            next(err);
        }
    }
    static async createFormula(req, res, next) {
        try {
            const formula = await payrollConfig_service_1.PayrollConfigService.createFormula(req.body, {
                userId: req.user.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: formula });
        }
        catch (err) {
            next(err);
        }
    }
    // ── Tax Brackets ──
    static async getTaxBrackets(req, res, next) {
        try {
            const brackets = await payrollConfig_service_1.PayrollConfigService.getTaxBrackets();
            res.json({ success: true, data: brackets });
        }
        catch (err) {
            next(err);
        }
    }
    static async getCurrentTaxBracket(req, res, next) {
        try {
            const bracket = await payrollConfig_service_1.PayrollConfigService.getCurrentTaxBracket();
            res.json({ success: true, data: bracket });
        }
        catch (err) {
            next(err);
        }
    }
    static async createTaxBracket(req, res, next) {
        try {
            const bracket = await payrollConfig_service_1.PayrollConfigService.createTaxBracket(req.body, {
                userId: req.user.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: bracket });
        }
        catch (err) {
            next(err);
        }
    }
    // ── Pension Rules ──
    static async getPensionRules(req, res, next) {
        try {
            const rules = await payrollConfig_service_1.PayrollConfigService.getPensionRules();
            res.json({ success: true, data: rules });
        }
        catch (err) {
            next(err);
        }
    }
    static async getCurrentPensionRule(req, res, next) {
        try {
            const rule = await payrollConfig_service_1.PayrollConfigService.getCurrentPensionRule();
            res.json({ success: true, data: rule });
        }
        catch (err) {
            next(err);
        }
    }
    static async createPensionRule(req, res, next) {
        try {
            const rule = await payrollConfig_service_1.PayrollConfigService.createPensionRule(req.body, {
                userId: req.user.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: rule });
        }
        catch (err) {
            next(err);
        }
    }
    // ── Dashboard ──
    static async getConfigDashboard(req, res, next) {
        try {
            const dashboard = await payrollConfig_service_1.PayrollConfigService.getConfigDashboard();
            res.json({ success: true, data: dashboard });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PayrollConfigController = PayrollConfigController;
//# sourceMappingURL=payrollConfig.controller.js.map