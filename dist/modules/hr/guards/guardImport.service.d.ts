import { Gender, GuardPosition } from '../../../types';
export interface ParsedGuardRow {
    index: number;
    status: 'READY' | 'DUPLICATE' | 'INVALID';
    fullNameRaw: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender: Gender;
    age?: number;
    dateOfBirth?: string;
    education?: string;
    fingerprint?: boolean;
    address?: string;
    phone?: string;
    hireDate: string;
    siteName: string;
    siteExists: boolean;
    isLeader: boolean;
    position: GuardPosition;
    salary: number;
    transportAllowance: number;
    guarantorName?: string;
    guarantorPhone?: string;
    notes?: string;
    warnings: string[];
}
export interface ImportPreviewResponse {
    summary: {
        totalRows: number;
        readyCount: number;
        duplicateCount: number;
        invalidCount: number;
        newSitesCount: number;
    };
    newSites: string[];
    rows: ParsedGuardRow[];
}
export declare class GuardImportService {
    static previewSheet(buffer: Buffer): Promise<ImportPreviewResponse>;
    static executeImport(rowsToImport: ParsedGuardRow[], auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<{
        success: boolean;
        importedCount: number;
        skippedCount: number;
        createdEmployees: {
            employeeCode: string;
            name: string;
            site: string;
        }[];
        failed: {
            name: string;
            reason: string;
        }[];
    }>;
    private static runImport;
}
//# sourceMappingURL=guardImport.service.d.ts.map