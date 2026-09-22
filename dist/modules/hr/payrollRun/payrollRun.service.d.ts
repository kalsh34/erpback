import { IPayrollRun } from '../../../models/PayrollRun';
interface AuditCtx {
    userId: string;
    ip?: string;
    ua?: string;
}
export declare class PayrollRunService {
    static getAll(query: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IPayrollRun, {}, {}> & IPayrollRun & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getById(id: string): Promise<IPayrollRun>;
    /**
     * Create a payroll run. Supports either a single period (periodFrom only)
     * or a period range (periodFrom -> periodTo). All periods between the two
     * (inclusive, sorted by year then month) are resolved into periodIds.
     */
    static create(data: {
        name: string;
        runType?: string;
        periodFrom: string;
        periodTo?: string;
    }, auditCtx?: AuditCtx): Promise<IPayrollRun>;
    static approve(id: string, auditCtx?: AuditCtx): Promise<IPayrollRun>;
    static markPaid(id: string, data: {
        paymentMethod?: string;
        bankReference?: string;
    }, auditCtx?: AuditCtx): Promise<IPayrollRun>;
    static remove(id: string, auditCtx?: AuditCtx): Promise<void>;
}
export {};
//# sourceMappingURL=payrollRun.service.d.ts.map