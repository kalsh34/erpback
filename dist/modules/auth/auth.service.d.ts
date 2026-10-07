import { IUser } from '../../models/User';
import { UserRole, Permission } from '../../types';
interface LoginResult {
    user: Omit<IUser, 'password'>;
    token: string;
}
export declare class AuthService {
    static register(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role: UserRole;
    }): Promise<IUser>;
    static login(email: string, password: string): Promise<LoginResult>;
    static getMe(userId: string): Promise<{
        permissions: Permission[];
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        employeeId?: import("mongoose").Types.ObjectId;
        phone?: string;
        avatarUrl?: string;
        moduleGrants: string[];
        moduleDenies: string[];
        isActive: boolean;
        lastLogin?: Date;
        createdAt: Date;
        updatedAt: Date;
        _id: import("mongoose").Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        id?: any;
        isNew: boolean;
        schema: import("mongoose").Schema;
        __v: number;
    }>;
    static changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    static updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        avatarUrl?: string;
    }): Promise<IUser>;
}
export {};
//# sourceMappingURL=auth.service.d.ts.map