import { IEmployee } from '../../../models/Employee';
import { EmployeeCategory, EmployeeStatus } from '../../../types';
export declare class EmployeeService {
    static getAll(query: {
        page?: number;
        limit?: number;
        category?: EmployeeCategory;
        status?: EmployeeStatus;
        search?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IEmployee, {}, {}> & IEmployee & Required<{
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
    static getById(id: string): Promise<IEmployee>;
    static create(data: Partial<IEmployee>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IEmployee>;
    static update(id: string, data: Partial<IEmployee>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IEmployee>;
    static delete(id: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<void>;
    static getGuards(query: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IEmployee, {}, {}> & IEmployee & Required<{
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
    static getOfficeStaff(query: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IEmployee, {}, {}> & IEmployee & Required<{
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
    static changeStatus(id: string, data: {
        status: EmployeeStatus;
        reason: string;
    }, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IEmployee>;
    private static statusAtMonthEnd;
    static getAnalytics(months?: number): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byCategory: Record<string, {
            total: number;
            active: number;
            inactive: number;
        }>;
        activeTotal: number;
        inactiveTotal: number;
        trend: {
            year: number;
            month: number;
            monthName: string;
            active: number;
            inactive: number;
            onLeave: number;
            newHires: number;
            deactivated: number;
        }[];
        generatedAt: string;
    }>;
}
//# sourceMappingURL=employee.service.d.ts.map