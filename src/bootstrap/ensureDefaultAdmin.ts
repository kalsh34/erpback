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
    const adminCount = await User.countDocuments({ role: { $in: ADMIN_ROLES } });

    if (adminCount > 0) {
      console.log(`[BOOTSTRAP] ${adminCount} admin user(s) already present - skipping default admin creation`);
      return;
    }

    const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@vitalpayroll.com').toLowerCase().trim();
    const plainPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123';
    const password = await bcrypt.hash(plainPassword, 12);

    const existing = await User.findOne({ email });

    if (existing) {
      existing.password = password;
      existing.role = UserRole.SUPER_ADMIN;
      existing.isActive = true;
      await existing.save();
      console.log(`[BOOTSTRAP] Promoted existing user to SUPER_ADMIN: ${email}`);
      return;
    }

    await User.create({
      email,
      password,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
    });

    console.log(`[BOOTSTRAP] Created default SUPER_ADMIN: ${email} (change this password after the first login)`);
  } catch (error) {
    console.error('[BOOTSTRAP] Failed to ensure default admin:', error);
  }
};
