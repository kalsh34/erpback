import { registerModule } from './registry';
import { UserRole, PERMISSIONS } from '../../types';

export function registerCorePermissions(): void {
  registerModule({
    module: 'core',
    permissions: [
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.SETTINGS_UPDATE,
      PERMISSIONS.PAYROLL_PERIOD_READ,
    ],
    roleDefaults: {
      [UserRole.SYSTEM_ADMIN]: [
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.SETTINGS_READ,
        PERMISSIONS.SETTINGS_UPDATE,
        PERMISSIONS.AUDIT_READ,
      ],
      [UserRole.HR_ADMIN]: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.SETTINGS_READ,
      ],
      [UserRole.OPERATIONS]: [
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.PAYROLL_PERIOD_READ,
      ],
    },
  });
}
