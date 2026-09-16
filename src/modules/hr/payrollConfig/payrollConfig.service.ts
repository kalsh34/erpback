import { SalaryComponent, ISalaryComponent } from '../../../models/SalaryComponent';
import { PayrollFormulaVersion, IPayrollFormulaVersion } from '../../../models/PayrollFormulaVersion';
import { TaxBracket, ITaxBracket } from '../../../models/TaxBracket';
import { PensionRule, IPensionRule } from '../../../models/PensionRule';
import { StaffPayrollRecord } from '../../../models/StaffPayrollRecord';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';

export class PayrollConfigService {
  // ── Salary Components ──

  static async getComponents(includeInactive = false): Promise<ISalaryComponent[]> {
    const filter: any = {};
    if (!includeInactive) filter.active = true;
    return SalaryComponent.find(filter).sort({ code: 1 });
  }

  static async getComponentById(id: string): Promise<ISalaryComponent> {
    const comp = await SalaryComponent.findById(id);
    if (!comp) throw ApiError.notFound('Salary component not found');
    return comp;
  }

  static async createComponent(
    data: { code: string; label: string; sourceType: 'CONTRACT' | 'HR_MONTHLY_INPUT' },
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<ISalaryComponent> {
    const existing = await SalaryComponent.findOne({ code: data.code.toUpperCase() });
    if (existing) throw ApiError.conflict(`Component with code "${data.code}" already exists`);

    const comp = await SalaryComponent.create({
      code: data.code.toUpperCase(),
      label: data.label,
      sourceType: data.sourceType,
    });

    AuditService.log({
      userId: auditCtx.userId,
      action: 'PAYROLL_COMPONENT_CREATE',
      entity: 'SalaryComponent',
      entityId: (comp._id as any).toString(),
      newValues: { code: comp.code, label: comp.label, sourceType: comp.sourceType },
      ipAddress: auditCtx.ip,
      userAgent: auditCtx.ua,
    });

    return comp;
  }

  static async updateComponent(
    id: string,
    data: { label?: string; sourceType?: 'CONTRACT' | 'HR_MONTHLY_INPUT'; active?: boolean },
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<ISalaryComponent> {
    const comp = await SalaryComponent.findById(id);
    if (!comp) throw ApiError.notFound('Salary component not found');

    if (data.sourceType && data.sourceType !== comp.sourceType) {
      const usedInFormula = await PayrollFormulaVersion.findOne({
        $or: [
          { grossComponentCodes: comp.code },
          { taxableComponentCodes: comp.code },
          { pensionBaseComponentCodes: comp.code },
          { deductionComponentCodes: comp.code },
        ],
      });
      if (usedInFormula) {
        throw ApiError.badRequest(
          `Cannot change sourceType of "${comp.code}" — it is referenced in formula version ${usedInFormula.version}. ` +
          `Retire this component and create a new one with the correct sourceType instead.`
        );
      }
    }

    const oldValues: any = {};
    if (data.label !== undefined) { oldValues.label = comp.label; comp.label = data.label; }
    if (data.sourceType !== undefined) { oldValues.sourceType = comp.sourceType; comp.sourceType = data.sourceType; }
    if (data.active !== undefined) { oldValues.active = comp.active; comp.active = data.active; }
    await comp.save();

    AuditService.log({
      userId: auditCtx.userId,
      action: 'PAYROLL_COMPONENT_UPDATE',
      entity: 'SalaryComponent',
      entityId: id,
      oldValues,
      newValues: data,
      ipAddress: auditCtx.ip,
      userAgent: auditCtx.ua,
    });

    return comp;
  }

  static async retireComponent(
    id: string,
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<ISalaryComponent> {
    const comp = await SalaryComponent.findById(id);
    if (!comp) throw ApiError.notFound('Salary component not found');
    if (!comp.active) throw ApiError.badRequest('Component is already retired');

    comp.active = false;
    await comp.save();

    AuditService.log({
      userId: auditCtx.userId,
      action: 'PAYROLL_COMPONENT_RETIRE',
      entity: 'SalaryComponent',
      entityId: id,
      newValues: { code: comp.code, active: false },
      ipAddress: auditCtx.ip,
      userAgent: auditCtx.ua,
    });

    return comp;
  }

  // ── Payroll Formula Versions ──

  static async getCurrentFormula(): Promise<IPayrollFormulaVersion | null> {
    return PayrollFormulaVersion.findOne({ isCurrent: true });
  }

  static async getFormulaVersion(version: number): Promise<IPayrollFormulaVersion> {
    const formula = await PayrollFormulaVersion.findOne({ version });
    if (!formula) throw ApiError.notFound(`Formula version ${version} not found`);
    return formula;
  }

  static async getAllFormulas(): Promise<IPayrollFormulaVersion[]> {
    return PayrollFormulaVersion.find().sort({ version: -1 });
  }

  static async createFormula(
    data: {
      effectiveFrom: string;
      grossComponentCodes: string[];
      taxableComponentCodes: string[];
      pensionBaseComponentCodes: string[];
      deductionComponentCodes: string[];
    },
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<IPayrollFormulaVersion> {
    const effectiveFrom = new Date(data.effectiveFrom);
    effectiveFrom.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (effectiveFrom < today) {
      throw ApiError.badRequest('effectiveFrom must be today or a future date');
    }

    const activeComponents = await SalaryComponent.find({ active: true });
    const activeCodes = new Set(activeComponents.map((c) => c.code));

    const allCodes = [
      ...data.grossComponentCodes,
      ...data.taxableComponentCodes,
      ...data.pensionBaseComponentCodes,
      ...data.deductionComponentCodes,
    ];
    for (const code of allCodes) {
      if (!activeCodes.has(code)) {
        throw ApiError.badRequest(`Component "${code}" is not active or does not exist`);
      }
    }

    if (!data.grossComponentCodes.includes('BASIC')) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'PAYROLL_FORMULA_WARNING',
        entity: 'PayrollFormulaVersion',
        newValues: { warning: 'BASIC excluded from gross components' },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }

    const maxVersion = await PayrollFormulaVersion.findOne().sort({ version: -1 });
    const nextVersion = (maxVersion?.version || 0) + 1;

    const currentFormula = await PayrollFormulaVersion.findOne({ isCurrent: true });
    if (currentFormula) {
      currentFormula.isCurrent = false;
      currentFormula.effectiveTo = new Date();
      await currentFormula.save();
    }

    const formula = await PayrollFormulaVersion.create({
      version: nextVersion,
      isCurrent: true,
      effectiveFrom,
      grossComponentCodes: data.grossComponentCodes,
      taxableComponentCodes: data.taxableComponentCodes,
      pensionBaseComponentCodes: data.pensionBaseComponentCodes,
      deductionComponentCodes: data.deductionComponentCodes,
      createdById: auditCtx.userId,
    });

    AuditService.log({
      userId: auditCtx.userId,
      action: 'PAYROLL_FORMULA_CREATE',
      entity: 'PayrollFormulaVersion',
      entityId: (formula._id as any).toString(),
      newValues: {
        version: nextVersion,
        effectiveFrom,
        gross: data.grossComponentCodes,
        taxable: data.taxableComponentCodes,
        pensionBase: data.pensionBaseComponentCodes,
        deductions: data.deductionComponentCodes,
      },
      ipAddress: auditCtx.ip,
      userAgent: auditCtx.ua,
    });

    return formula;
  }

  // ── Tax Brackets ──

  static async getTaxBrackets(): Promise<ITaxBracket[]> {
    return TaxBracket.find().sort({ effectiveFrom: -1 });
  }

  static async getCurrentTaxBracket(): Promise<ITaxBracket | null> {
    return TaxBracket.findOne({ isCurrent: true });
  }

  static async createTaxBracket(
    data: {
      label: string;
      brackets: { min: number; max: number | null; rate: number; deduction: number }[];
      effectiveFrom: string;
    },
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<ITaxBracket> {
    const effectiveFrom = new Date(data.effectiveFrom);

    const current = await TaxBracket.findOne({ isCurrent: true });
    if (current) {
      current.isCurrent = false;
      current.effectiveTo = effectiveFrom;
      await current.save();
    }

    const bracket = await TaxBracket.create({
      label: data.label,
      brackets: data.brackets,
      effectiveFrom,
      isCurrent: true,
    });

    AuditService.log({
      userId: auditCtx.userId,
      action: 'TAX_BRACKET_CREATE',
      entity: 'TaxBracket',
      entityId: (bracket._id as any).toString(),
      newValues: { label: data.label, bracketCount: data.brackets.length },
      ipAddress: auditCtx.ip,
      userAgent: auditCtx.ua,
    });

    return bracket;
  }

  // ── Pension Rules ──

  static async getPensionRules(): Promise<IPensionRule[]> {
    return PensionRule.find().sort({ effectiveFrom: -1 });
  }

  static async getCurrentPensionRule(): Promise<IPensionRule | null> {
    return PensionRule.findOne({ isCurrent: true });
  }

  static async createPensionRule(
    data: {
      label: string;
      employeeRate: number;
      employerRate: number;
      effectiveFrom: string;
    },
    auditCtx: { userId: string; ip?: string; ua?: string }
  ): Promise<IPensionRule> {
    const effectiveFrom = new Date(data.effectiveFrom);

    const current = await PensionRule.findOne({ isCurrent: true });
    if (current) {
      current.isCurrent = false;
      current.effectiveTo = effectiveFrom;
      await current.save();
    }

    const rule = await PensionRule.create({
      label: data.label,
      employeeRate: data.employeeRate,
      employerRate: data.employerRate,
      effectiveFrom,
      isCurrent: true,
    });

    AuditService.log({
      userId: auditCtx.userId,
      action: 'PENSION_RULE_CREATE',
      entity: 'PensionRule',
      entityId: (rule._id as any).toString(),
      newValues: { label: data.label, employeeRate: data.employeeRate, employerRate: data.employerRate },
      ipAddress: auditCtx.ip,
      userAgent: auditCtx.ua,
    });

    return rule;
  }

  // ── Dashboard ──

  static async getConfigDashboard() {
    const [components, currentFormula, currentTax, currentPension, formulaCount] = await Promise.all([
      SalaryComponent.find({ active: true }).sort({ code: 1 }),
      PayrollFormulaVersion.findOne({ isCurrent: true }),
      TaxBracket.findOne({ isCurrent: true }),
      PensionRule.findOne({ isCurrent: true }),
      PayrollFormulaVersion.countDocuments(),
    ]);

    return {
      components,
      currentFormula,
      currentTax,
      currentPension,
      formulaCount,
    };
  }
}
