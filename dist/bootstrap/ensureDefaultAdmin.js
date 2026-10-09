"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDefaultAdmin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const types_1 = require("../types");
const ADMIN_ROLES = [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.HR_ADMIN];
/**
 * Guarantees that a freshly pointed-at database (Atlas, local, or a new deploy)
 * always has an administrator account, so the system can never be locked out.
 * Idempotent: does nothing as soon as any admin user exists.
 */
const ensureDefaultAdmin = async () => {
    try {
        const defaultPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'password123';
        const passwordHash = await bcryptjs_1.default.hash(defaultPassword, 12);
        const demoUsers = [
            { email: 'admin@vitalpayroll.com', firstName: 'System', lastName: 'Admin', role: types_1.UserRole.SUPER_ADMIN },
            { email: 'hr@vitalpayroll.com', firstName: 'Henok', lastName: 'Tadesse', role: types_1.UserRole.HR_ADMIN },
            { email: 'finance@vitalpayroll.com', firstName: 'Finance', lastName: 'Officer', role: types_1.UserRole.FINANCE_OFFICER },
            { email: 'ops@vitalpayroll.com', firstName: 'Operations', lastName: 'Manager', role: types_1.UserRole.OPERATIONS },
            { email: 'guard@vitalpayroll.com', firstName: 'Abebe', lastName: 'Kebede', role: types_1.UserRole.GUARD },
        ];
        for (const u of demoUsers) {
            const existing = await User_1.User.findOne({ email: u.email });
            if (!existing) {
                await User_1.User.create({
                    ...u,
                    password: passwordHash,
                    isActive: true,
                });
                console.log(`[BOOTSTRAP] Created demo user: ${u.email} (${u.role})`);
            }
        }
    }
    catch (error) {
        console.error('[BOOTSTRAP] Failed to ensure default demo users:', error);
    }
};
exports.ensureDefaultAdmin = ensureDefaultAdmin;
//# sourceMappingURL=ensureDefaultAdmin.js.map