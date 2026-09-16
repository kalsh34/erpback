import { IPayrollPeriod } from '../../../models/PayrollPeriod';
import { PayrollPeriodStatus } from '../../../types';
export declare class PayrollPeriodService {
    static getAll(query: {
        year?: number;
        status?: string;
    }): Promise<(import("mongoose").Document<unknown, {}, IPayrollPeriod, {}, {}> & IPayrollPeriod & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getById(id: string): Promise<IPayrollPeriod>;
    static create(data: Partial<IPayrollPeriod>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IPayrollPeriod>;
    static updateStatus(id: string, status: PayrollPeriodStatus, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IPayrollPeriod>;
    static lock(id: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IPayrollPeriod>;
}
//# sourceMappingURL=payrollPeriod.service.d.ts.map