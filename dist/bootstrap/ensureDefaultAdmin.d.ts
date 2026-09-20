/**
 * Guarantees that a freshly pointed-at database (Atlas, local, or a new deploy)
 * always has an administrator account, so the system can never be locked out.
 * Idempotent: does nothing as soon as any admin user exists.
 */
export declare const ensureDefaultAdmin: () => Promise<void>;
//# sourceMappingURL=ensureDefaultAdmin.d.ts.map