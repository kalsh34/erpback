import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { UserRole } from '../types';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN];

/**
 * Guarantees that a freshly pointed-at database (Atlas, local, or a new deploy)
 * always has an administrator account, so the system can never be locked out.
 * Idempotent: does nothing as soon as any admin user exists.
 */
export const ensureDefaultAdmin = async (): Promise<void> => {
  try {
    const defaultPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const demoUsers = [
      { email: 'admin@vitalpayroll.com', firstName: 'System', lastName: 'Admin', role: UserRole.SUPER_ADMIN },
      { email: 'hr@vitalpayroll.com', firstName: 'Henok', lastName: 'Tadesse', role: UserRole.HR_ADMIN },
      { email: 'finance@vitalpayroll.com', firstName: 'Finance', lastName: 'Officer', role: UserRole.FINANCE_OFFICER },
      { email: 'ops@vitalpayroll.com', firstName: 'Operations', lastName: 'Manager', role: UserRole.OPERATIONS },
      { email: 'guard@vitalpayroll.com', firstName: 'Abebe', lastName: 'Kebede', role: UserRole.GUARD },
    ];

    for (const u of demoUsers) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create({
          ...u,
          password: passwordHash,
          isActive: true,
        });
        console.log(`[BOOTSTRAP] Created demo user: ${u.email} (${u.role})`);
      }
    }
  } catch (error) {
    console.error('[BOOTSTRAP] Failed to ensure default demo users:', error);
  }
};
