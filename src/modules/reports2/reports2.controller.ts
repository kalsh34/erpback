import { Request, Response, NextFunction } from 'express';
import { ModuleReportsService } from './reports2.service';
import { UserRole } from '../../types';
import { roleCanReadReport, ReportKey } from './reportScopes';
import { ApiError } from '../../common/ApiError';

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/**
 * Route-level role guard (defense layer 1; the service re-checks) — shared by
 * every endpoint in this controller. `report.read` opens the reports module;
 * WHICH module report a role may read is decided by REPORT_ROLES.
 */
function requireReportRole(req: Request, report: ReportKey): UserRole {
  const role = req.user?.role as UserRole | undefined;
  if (!role || !roleCanReadReport(role, report)) {
    throw ApiError.forbidden(`Role '${role ?? 'UNKNOWN'}' is not authorized to read the '${report}' report`);
  }
  return role;
}

export class Reports2Controller {
  static async hr(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ModuleReportsService.hrReport({
        category: str(req.query.category),
        status: str(req.query.status),
        department: str(req.query.department),
        search: str(req.query.search),
        joinedFrom: str(req.query.joinedFrom),
        joinedTo: str(req.query.joinedTo),
      }, requireReportRole(req, 'hr'));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async sites(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ModuleReportsService.sitesReport({
        status: str(req.query.status),
        siteType: str(req.query.siteType),
        search: str(req.query.search),
      }, requireReportRole(req, 'sites'));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async guards(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ModuleReportsService.guardsReport({
        status: str(req.query.status),
        siteId: str(req.query.siteId),
        month: str(req.query.month),
      }, requireReportRole(req, 'guards'));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async guardAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ModuleReportsService.guardAttendanceReport({
        month: str(req.query.month),
        guardId: str(req.query.guardId),
        siteId: str(req.query.siteId),
        status: str(req.query.status),
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      }, requireReportRole(req, 'guard-attendance'));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async staffAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ModuleReportsService.staffAttendanceReport({
        month: str(req.query.month),
        employeeId: str(req.query.employeeId),
        status: str(req.query.status),
        department: str(req.query.department),
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      }, requireReportRole(req, 'staff-attendance'));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async payroll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ModuleReportsService.payrollReport({
        module: str(req.query.module) === 'STAFF' ? 'STAFF' : 'GUARD',
        periodKey: str(req.query.periodKey),
        runStatus: str(req.query.runStatus),
        search: str(req.query.search),
      }, requireReportRole(req, 'payroll'));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async audit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ModuleReportsService.auditReport({
        action: str(req.query.action),
        entity: str(req.query.entity),
        userId: str(req.query.userId),
        from: str(req.query.from),
        to: str(req.query.to),
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      }, requireReportRole(req, 'audit'));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async users(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ModuleReportsService.usersReport({
        role: str(req.query.role),
        isActive: str(req.query.isActive),
        search: str(req.query.search),
      }, requireReportRole(req, 'users'));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}
