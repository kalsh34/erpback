"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RulesController = void 0;
const rules_service_1 = require("./rules.service");
class RulesController {
    static async getTaxBrackets(_req, res, next) {
        try {
            const brackets = await rules_service_1.RulesService.getTaxBrackets();
            res.json({ success: true, data: brackets });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCurrentTaxBracket(_req, res, next) {
        try {
            const bracket = await rules_service_1.RulesService.getCurrentTaxBracket();
            res.json({ success: true, data: bracket });
        }
        catch (error) {
            next(error);
        }
    }
    static async createTaxBracket(req, res, next) {
        try {
            const bracket = await rules_service_1.RulesService.createTaxBracket(req.body);
            res.status(201).json({ success: true, data: bracket });
        }
        catch (error) {
            next(error);
        }
    }
    static async getPensionRules(_req, res, next) {
        try {
            const rules = await rules_service_1.RulesService.getPensionRules();
            res.json({ success: true, data: rules });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCurrentPensionRule(_req, res, next) {
        try {
            const rule = await rules_service_1.RulesService.getCurrentPensionRule();
            res.json({ success: true, data: rule });
        }
        catch (error) {
            next(error);
        }
    }
    static async createPensionRule(req, res, next) {
        try {
            const rule = await rules_service_1.RulesService.createPensionRule(req.body);
            res.status(201).json({ success: true, data: rule });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RulesController = RulesController;
//# sourceMappingURL=rules.controller.js.map