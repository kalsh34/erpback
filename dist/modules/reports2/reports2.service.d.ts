import { UserRole } from '../../types';
export interface ReportResult {
    report: string;
    generatedAt: Date;
    filters: Record<string, unknown>;
    summary: Record<string, unknown>;
    rows: Record<string, unknown>[];
}
export declare class ModuleReportsService {
    static hrReport(q: {
        category?: string;
        status?: string;
        department?: string;
        search?: string;
        joinedFrom?: string;
        joinedTo?: string;
    }, requestedBy?: UserRole): Promise<ReportResult>;
    static sitesReport(q: {
        status?: string;
        siteType?: string;
        search?: string;
    }, requestedBy?: UserRole): Promise<ReportResult>;
    static guardsReport(q: {
        status?: string;
        siteId?: string;
        month?: string;
    }, requestedBy?: UserRole): Promise<ReportResult>;
    static guardAttendanceReport(q: {
        month?: string;
        guardId?: string;
        siteId?: string;
        status?: string;
        limit?: number;
    }, requestedBy?: UserRole): Promise<ReportResult>;
    static staffAttendanceReport(q: {
        month?: string;
        employeeId?: string;
        status?: string;
        department?: string;
        limit?: number;
    }, requestedBy?: UserRole): Promise<ReportResult>;
    static payrollReport(q: {
        module?: 'GUARD' | 'STAFF';
        periodKey?: string;
        runStatus?: string;
        search?: string;
    }, requestedBy?: UserRole): Promise<ReportResult>;
    static auditReport(q: {
        action?: string;
        entity?: string;
        userId?: string;
        from?: string;
        to?: string;
        limit?: number;
    }, requestedBy?: UserRole): Promise<ReportResult>;
    static usersReport(q: {
        role?: string;
        isActive?: string;
        search?: string;
    }, requestedBy?: UserRole): Promise<ReportResult>;
}
//# sourceMappingURL=reports2.service.d.ts.map