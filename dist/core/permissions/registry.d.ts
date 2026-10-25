import { UserRole, Permission } from '../../types';
export interface ModulePermissions {
    module: string;
    permissions: Permission[];
    roleDefaults: Partial<Record<UserRole, Permission[]>>;
}
export declare function registerModule(config: ModulePermissions): void;
export declare function getAllPermissions(): Permission[];
export declare function getRolePermissions(role: UserRole): Permission[];
export declare function getRegisteredModules(): ModulePermissions[];
//# sourceMappingURL=registry.d.ts.map