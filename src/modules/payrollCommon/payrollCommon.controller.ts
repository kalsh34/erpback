import { Request, Response, NextFunction } from 'express';
import { StatutoryService } from './statutory.service';
import { DeductionsService } from './deductions.service';
import { ApiError } from '../../common/ApiError';
import { AuditService } from '../../core/audit/AuditService';

/** Shared payroll configuration endpoints: tax tables, pension rules, deductions. */
export class PayrollCommonController {
  // ── Tax tables ─────────────────────────────────────────────────────
  static async listTaxTables(req: Request, res: Response, next: NextFunction) {
    try {
      const kind = req.query.kind === 'STAFF' ? 'STAFF' : req.query.kind === 'GUARD' ? 'GUARD' : undefined;
      res.json({ success: true, data: await StatutoryService.listTaxTables(kind as any) });
    } catch (error) { next(error); }
  }

  static async createTaxTable(req: Request, res: Response, next: NextFunction) {
    try {
      const table = await StatutoryService.createTaxTable({ ...req.body, userId: req.user?.userId || '' });
      await AuditService.log({
        userId: req.user?.userId || '',
        action: 'TAX_TABLE_CREATE',
        entity: 'TaxBracket',
        entityId: table._id.toString(),
        newValues: { name: table.name, effectiveFrom: table.effectiveFrom, brackets: table.brackets.length },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: table });
    } catch (error) { next(error); }
  }

  // ── Pension rules ──────────────────────────────────────────────────
  static async listPensionRules(req: Request, res: Response, next: NextFunction) {
    try {
      const kind = req.query.kind === 'STAFF' ? 'STAFF' : req.query.kind === 'GUARD' ? 'GUARD' : undefined;
      res.json({ success: true, data: await StatutoryService.listPensionRules(kind as any) });
    } catch (error) { next(error); }
  }

  static async createPensionRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await StatutoryService.createPensionRule({ ...req.body, userId: req.user?.userId || '' });
      await AuditService.log({
        userId: req.user?.userId || '',
        action: 'PENSION_RULE_CREATE',
        entity: 'PensionRule',
        entityId: rule._id.toString(),
        newValues: { name: rule.name, employeePercent: rule.employeePercent, employerPercent: rule.employerPercent },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: rule });
    } catch (error) { next(error); }
  }

  // ── Deductions ─────────────────────────────────────────────────────
  static async listDeductions(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId, status } = req.query;
      res.json({
        success: true,
        data: await DeductionsService.list({
          employeeId: employeeId as string | undefined,
          status: status as string | undefined,
        }),
      });
    } catch (error) { next(error); }
  }

  static async createDeduction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.body.employeeId) throw ApiError.badRequest('employeeId is required');
      const doc = await DeductionsService.create({ ...req.body, userId: req.user?.userId || '' });
      await AuditService.log({
        userId: req.user?.userId || '',
        action: 'EMPLOYEE_DEDUCTION_CREATE',
        entity: 'EmployeeDeduction',
        entityId: doc._id.toString(),
        newValues: { employeeId: doc.employeeId.toString(), type: doc.type, label: doc.label, totalAmount: doc.totalAmount },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: doc });
    } catch (error) { next(error); }
  }

  static async cancelDeduction(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await DeductionsService.cancel(req.params.id);
      await AuditService.log({
        userId: req.user?.userId || '',
        action: 'EMPLOYEE_DEDUCTION_CANCEL',
        entity: 'EmployeeDeduction',
        entityId: doc._id.toString(),
        newValues: { status: doc.status },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.json({ success: true, data: doc });
    } catch (error) { next(error); }
  }
}
