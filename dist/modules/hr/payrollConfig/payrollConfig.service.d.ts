import { ISalaryComponent } from '../../../models/SalaryComponent';
import { IPayrollFormulaVersion } from '../../../models/PayrollFormulaVersion';
import { ITaxBracket } from '../../../models/TaxBracket';
import { IPensionRule } from '../../../models/PensionRule';
export declare class PayrollConfigService {
    static getComponents(includeInactive?: boolean): Promise<ISalaryComponent[]>;
    static getComponentById(id: string): Promise<ISalaryComponent>;
    static createComponent(data: {
        code: string;
        label: string;
        sourceType: 'CONTRACT' | 'HR_MONTHLY_INPUT';
    }, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ISalaryComponent>;
    static updateComponent(id: string, data: {
        label?: string;
        sourceType?: 'CONTRACT' | 'HR_MONTHLY_INPUT';
        active?: boolean;
    }, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ISalaryComponent>;
    static retireComponent(id: string, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ISalaryComponent>;
    static getCurrentFormula(): Promise<IPayrollFormulaVersion | null>;
    static getFormulaVersion(version: number): Promise<IPayrollFormulaVersion>;
    static getAllFormulas(): Promise<IPayrollFormulaVersion[]>;
    static createFormula(data: {
        effectiveFrom: string;
        grossComponentCodes: string[];
        taxableComponentCodes: string[];
        pensionBaseComponentCodes: string[];
        deductionComponentCodes: string[];
    }, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IPayrollFormulaVersion>;
    static getTaxBrackets(): Promise<ITaxBracket[]>;
    static getCurrentTaxBracket(): Promise<ITaxBracket | null>;
    static createTaxBracket(data: {
        label: string;
        brackets: {
            min: number;
            max: number | null;
            rate: number;
            deduction: number;
        }[];
        effectiveFrom: string;
    }, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ITaxBracket>;
    static getPensionRules(): Promise<IPensionRule[]>;
    static getCurrentPensionRule(): Promise<IPensionRule | null>;
    static createPensionRule(data: {
        label: string;
        employeeRate: number;
        employerRate: number;
        effectiveFrom: string;
    }, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IPensionRule>;
    static getConfigDashboard(): Promise<{
        components: (import("mongoose").Document<unknown, {}, ISalaryComponent, {}, {}> & ISalaryComponent & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        currentFormula: (import("mongoose").Document<unknown, {}, IPayrollFormulaVersion, {}, {}> & IPayrollFormulaVersion & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
        currentTax: (import("mongoose").Document<unknown, {}, ITaxBracket, {}, {}> & ITaxBracket & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
        currentPension: (import("mongoose").Document<unknown, {}, IPensionRule, {}, {}> & IPensionRule & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
        formulaCount: number;
    }>;
}
//# sourceMappingURL=payrollConfig.service.d.ts.map