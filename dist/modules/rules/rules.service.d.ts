export declare class RulesService {
    static getTaxBrackets(): Promise<(import("mongoose").Document<unknown, {}, import("../../models/TaxBracket").ITaxBracket, {}, {}> & import("../../models/TaxBracket").ITaxBracket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getCurrentTaxBracket(): Promise<import("mongoose").Document<unknown, {}, import("../../models/TaxBracket").ITaxBracket, {}, {}> & import("../../models/TaxBracket").ITaxBracket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static createTaxBracket(data: any): Promise<import("mongoose").Document<unknown, {}, import("../../models/TaxBracket").ITaxBracket, {}, {}> & import("../../models/TaxBracket").ITaxBracket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateTaxBracket(id: string, data: any): Promise<import("mongoose").Document<unknown, {}, import("../../models/TaxBracket").ITaxBracket, {}, {}> & import("../../models/TaxBracket").ITaxBracket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getPensionRules(): Promise<(import("mongoose").Document<unknown, {}, import("../../models/PensionRule").IPensionRule, {}, {}> & import("../../models/PensionRule").IPensionRule & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getCurrentPensionRule(): Promise<import("mongoose").Document<unknown, {}, import("../../models/PensionRule").IPensionRule, {}, {}> & import("../../models/PensionRule").IPensionRule & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static createPensionRule(data: any): Promise<import("mongoose").Document<unknown, {}, import("../../models/PensionRule").IPensionRule, {}, {}> & import("../../models/PensionRule").IPensionRule & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updatePensionRule(id: string, data: any): Promise<import("mongoose").Document<unknown, {}, import("../../models/PensionRule").IPensionRule, {}, {}> & import("../../models/PensionRule").IPensionRule & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=rules.service.d.ts.map