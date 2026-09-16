import { TaxBracket } from '../../models/TaxBracket';
import { PensionRule } from '../../models/PensionRule';
import { ApiError } from '../../common/ApiError';

export class RulesService {
  // --- Tax Brackets ---
  static async getTaxBrackets() {
    return TaxBracket.find().sort({ effectiveFrom: -1 });
  }

  static async getCurrentTaxBracket() {
    const bracket = await TaxBracket.findOne({ isCurrent: true });
    if (!bracket) throw ApiError.notFound('No active tax bracket');
    return bracket;
  }

  static async createTaxBracket(data: any) {
    if (data.isCurrent) {
      await TaxBracket.updateMany({ isCurrent: true }, { isCurrent: false });
    }
    return TaxBracket.create(data);
  }

  static async updateTaxBracket(id: string, data: any) {
    const bracket = await TaxBracket.findByIdAndUpdate(id, data, { new: true });
    if (!bracket) throw ApiError.notFound('Tax bracket not found');
    return bracket;
  }

  // --- Pension Rules ---
  static async getPensionRules() {
    return PensionRule.find().sort({ effectiveFrom: -1 });
  }

  static async getCurrentPensionRule() {
    const rule = await PensionRule.findOne({ isCurrent: true });
    if (!rule) throw ApiError.notFound('No active pension rule');
    return rule;
  }

  static async createPensionRule(data: any) {
    if (data.isCurrent) {
      await PensionRule.updateMany({ isCurrent: true }, { isCurrent: false });
    }
    return PensionRule.create(data);
  }

  static async updatePensionRule(id: string, data: any) {
    const rule = await PensionRule.findByIdAndUpdate(id, data, { new: true });
    if (!rule) throw ApiError.notFound('Pension rule not found');
    return rule;
  }
}
