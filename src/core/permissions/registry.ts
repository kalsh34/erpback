import { UserRole, Permission } from '../../types';

export interface ModulePermissions {
  module: string;
  permissions: Permission[];
  roleDefaults: Partial<Record<UserRole, Permission[]>>;
}

const registeredModules: ModulePermissions[] = [];

export function registerModule(config: ModulePermissions): void {
  const existing = registeredModules.findIndex((m) => m.module === config.module);
  if (existing >= 0) {
    registeredModules[existing] = config;
  } else {
    registeredModules.push(config);
  }
}

export function getAllPermissions(): Permission[] {
  const perms = new Set<Permission>();
  for (const mod of registeredModules) {
    for (const p of mod.permissions) {
      perms.add(p);
    }
  }
  return Array.from(perms);
}

export function getRolePermissions(role: UserRole): Permission[] {
  const perms = new Set<Permission>();
  for (const mod of registeredModules) {
    const rolePerms = mod.roleDefaults[role];
    if (rolePerms) {
      for (const p of rolePerms) {
        perms.add(p);
      }
    }
  }
  return Array.from(perms);
}

export function getRegisteredModules(): ModulePermissions[] {
  return [...registeredModules];
}
