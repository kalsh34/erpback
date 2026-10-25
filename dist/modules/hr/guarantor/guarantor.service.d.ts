import { IGuarantor } from '../../../models/Guarantor';
interface AuditCtx {
    userId: string;
    ip?: string;
    userAgent?: string;
}
export declare class GuarantorService {
    static getByEmployeeId(employeeId: string): Promise<IGuarantor[]>;
    static getById(id: string): Promise<IGuarantor>;
    static create(data: Partial<IGuarantor>, auditCtx?: AuditCtx): Promise<IGuarantor>;
    static update(id: string, data: Partial<IGuarantor>, auditCtx?: AuditCtx): Promise<IGuarantor>;
    static verify(id: string, verifiedById: string, auditCtx?: AuditCtx): Promise<IGuarantor>;
    static reject(id: string, rejectionReason: string, auditCtx?: AuditCtx): Promise<IGuarantor>;
    static delete(id: string, auditCtx?: AuditCtx): Promise<void>;
}
export {};
//# sourceMappingURL=guarantor.service.d.ts.map