import { IUser } from '../../models/User';
import { UserRole } from '../../types';
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
    static getMe(userId: string): Promise<IUser>;
    static changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    static updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    }): Promise<IUser>;
}
export {};
//# sourceMappingURL=auth.service.d.ts.map