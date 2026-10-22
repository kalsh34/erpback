import { registerModule } from '../../core/permissions/registry';
import { UserRole, PERMISSIONS } from '../../types';

/**
 * FLEET module permissions. FLEET_READ is the read surface for the module;
 * FLEET_MANAGE covers vehicles/maintenance/documents; FLEET_ASSIGN is the
 * narrower dispatch action (operator-level assignment of vehicles/driver).
 */
export function registerFleetPermissions(): void {
  registerModule({
    module: 'fleet',
    permissions: [
      PERMISSIONS.FLEET_READ,
      PERMISSIONS.FLEET_MANAGE,
      PERMISSIONS.FLEET_ASSIGN,
      PERMISSIONS.FLEET_REPORT,
    ],
    roleDefaults: {
      [UserRole.SUPER_ADMIN]: [
        PERMISSIONS.FLEET_READ,
        PERMISSIONS.FLEET_MANAGE,
        PERMISSIONS.FLEET_ASSIGN,
        PERMISSIONS.FLEET_REPORT,
      ],
      [UserRole.SYSTEM_ADMIN]: [
        PERMISSIONS.FLEET_READ,
        PERMISSIONS.FLEET_MANAGE,
        PERMISSIONS.FLEET_ASSIGN,
        PERMISSIONS.FLEET_REPORT,
      ],
      [UserRole.OPERATIONS]: [
        PERMISSIONS.FLEET_READ,
        PERMISSIONS.FLEET_ASSIGN,
      ],
      [UserRole.FINANCE_OFFICER]: [
        PERMISSIONS.FLEET_READ,
        PERMISSIONS.FLEET_REPORT,
      ],
      [UserRole.HR_ADMIN]: [
        PERMISSIONS.FLEET_READ,
        PERMISSIONS.FLEET_ASSIGN,
      ],
      [UserRole.HEAD]: [
        PERMISSIONS.FLEET_READ,
        PERMISSIONS.FLEET_REPORT,
      ],
      [UserRole.CEO]: [
        PERMISSIONS.FLEET_READ,
        PERMISSIONS.FLEET_REPORT,
      ],
      [UserRole.GUARD]: [],
    },
  });
}
