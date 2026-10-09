import { ITaxBracket, ITaxBracketLine } from '../../models/TaxBracket';
import { IPensionRule } from '../../models/PensionRule';
type StatutoryKind = 'GUARD' | 'STAFF';
/**
 * STATUTORY SERVICE — income tax and pension configuration/calculation shared
 * by payroll systems (guard payroll today, staff payroll later).
 *
 * Configuration is date-effective: a payroll period resolves the tax table and
 * pension rule that were in force at the start of that period, so changing the
 * rules never rewrites finalized payroll.
 */
export declare class StatutoryService {
    /** Tax table in force at the given date (latest effectiveFrom wins). */
    static getTaxTableForPeriod(periodStart: Date, kind?: StatutoryKind): Promise<ITaxBracket | null>;
    /** Pension rule in force at the given date (latest effectiveFrom wins). */
    static getPensionRuleForPeriod(periodStart: Date, kind?: StatutoryKind): Promise<IPensionRule | null>;
    /**
     * Progressive monthly income tax. Brackets are percentages; `max: null`
     * means "up to infinity". Gaps between brackets are treated as 0%.
     */
    static computeProgressiveTax(taxable: number, brackets: ITaxBracketLine[]): number;
    /**
     * Employee/employer pension on a pensionable base, honouring optional
     * min/max pensionable-salary caps.
     */
    static computePension(base: number, rule: Pick<IPensionRule, 'employeePercent' | 'employerPercent' | 'minPensionableSalary' | 'maxPensionableSalary'>): {
        pensionableBase: number;
        employee: number;
        employer: number;
    };
    static listTaxTables(kind?: StatutoryKind): Promise<(import("mongoose").Document<unknown, {}, ITaxBracket, {}, {}> & ITaxBracket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static createTaxTable(input: {
        name: string;
        kind?: StatutoryKind;
        effectiveFrom: string;
        effectiveTo?: string | null;
        brackets: ITaxBracketLine[];
        userId: string;
    }): Promise<import("mongoose").Document<unknown, {}, ITaxBracket, {}, {}> & ITaxBracket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static listPensionRules(kind?: StatutoryKind): Promise<(import("mongoose").Document<unknown, {}, IPensionRule, {}, {}> & IPensionRule & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static createPensionRule(input: {
        name: string;
        kind?: StatutoryKind;
        employeePercent: number;
        employerPercent: number;
        minPensionableSalary?: number | null;
        maxPensionableSalary?: number | null;
        effectiveFrom: string;
        effectiveTo?: string | null;
        userId: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPensionRule, {}, {}> & IPensionRule & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=statutory.service.d.ts.map