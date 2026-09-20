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
        const adminCount = await User_1.User.countDocuments({ role: { $in: ADMIN_ROLES } });
        if (adminCount > 0) {
            console.log(`[BOOTSTRAP] ${adminCount} admin user(s) already present - skipping default admin creation`);
            return;
        }
        const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@vitalpayroll.com').toLowerCase().trim();
        const plainPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123';
        const password = await bcryptjs_1.default.hash(plainPassword, 12);
        const existing = await User_1.User.findOne({ email });
        if (existing) {
            existing.password = password;
            existing.role = types_1.UserRole.SUPER_ADMIN;
            existing.isActive = true;
            await existing.save();
            console.log(`[BOOTSTRAP] Promoted existing user to SUPER_ADMIN: ${email}`);
            return;
        }
        await User_1.User.create({
            email,
            password,
            firstName: 'System',
            lastName: 'Admin',
            role: types_1.UserRole.SUPER_ADMIN,
        });
        console.log(`[BOOTSTRAP] Created default SUPER_ADMIN: ${email} (change this password after the first login)`);
    }
    catch (error) {
        console.error('[BOOTSTRAP] Failed to ensure default admin:', error);
    }
};
exports.ensureDefaultAdmin = ensureDefaultAdmin;
//# sourceMappingURL=ensureDefaultAdmin.js.map