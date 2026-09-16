import { IContract } from '../../../models/Contract';
export declare class ContractService {
    static getByEmployeeId(employeeId: string): Promise<IContract | null>;
    static getAll(query: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IContract, {}, {}> & IContract & Required<{
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
    static create(data: Partial<IContract>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IContract>;
    static update(id: string, data: Partial<IContract>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IContract>;
    static delete(id: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<void>;
}
//# sourceMappingURL=contract.service.d.ts.map