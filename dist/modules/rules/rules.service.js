"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RulesService = void 0;
const TaxBracket_1 = require("../../models/TaxBracket");
const PensionRule_1 = require("../../models/PensionRule");
const ApiError_1 = require("../../common/ApiError");
class RulesService {
    // --- Tax Brackets ---
    static async getTaxBrackets() {
        return TaxBracket_1.TaxBracket.find().sort({ effectiveFrom: -1 });
    }
    static async getCurrentTaxBracket() {
        const bracket = await TaxBracket_1.TaxBracket.findOne({ isCurrent: true });
        if (!bracket)
            throw ApiError_1.ApiError.notFound('No active tax bracket');
        return bracket;
    }
    static async createTaxBracket(data) {
        if (data.isCurrent) {
            await TaxBracket_1.TaxBracket.updateMany({ isCurrent: true }, { isCurrent: false });
        }
        return TaxBracket_1.TaxBracket.create(data);
    }
    static async updateTaxBracket(id, data) {
        const bracket = await TaxBracket_1.TaxBracket.findByIdAndUpdate(id, data, { new: true });
        if (!bracket)
            throw ApiError_1.ApiError.notFound('Tax bracket not found');
        return bracket;
    }
    // --- Pension Rules ---
    static async getPensionRules() {
        return PensionRule_1.PensionRule.find().sort({ effectiveFrom: -1 });
    }
    static async getCurrentPensionRule() {
        const rule = await PensionRule_1.PensionRule.findOne({ isCurrent: true });
        if (!rule)
            throw ApiError_1.ApiError.notFound('No active pension rule');
        return rule;
    }
    static async createPensionRule(data) {
        if (data.isCurrent) {
            await PensionRule_1.PensionRule.updateMany({ isCurrent: true }, { isCurrent: false });
        }
        return PensionRule_1.PensionRule.create(data);
    }
    static async updatePensionRule(id, data) {
        const rule = await PensionRule_1.PensionRule.findByIdAndUpdate(id, data, { new: true });
        if (!rule)
            throw ApiError_1.ApiError.notFound('Pension rule not found');
        return rule;
    }
}
exports.RulesService = RulesService;
//# sourceMappingURL=rules.service.js.map