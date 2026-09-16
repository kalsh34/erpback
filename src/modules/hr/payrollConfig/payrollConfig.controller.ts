import { Request, Response, NextFunction } from 'express';
import { PayrollConfigService } from './payrollConfig.service';

export class PayrollConfigController {
  // ── Components ──

  static async getComponents(req: Request, res: Response, next: NextFunction) {
    try {
      const components = await PayrollConfigService.getComponents(req.query.includeInactive === 'true');
      res.json({ success: true, data: components });
    } catch (err) { next(err); }
  }

  static async getComponentById(req: Request, res: Response, next: NextFunction) {
    try {
      const comp = await PayrollConfigService.getComponentById(req.params.id);
      res.json({ success: true, data: comp });
    } catch (err) { next(err); }
  }

  static async createComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const comp = await PayrollConfigService.createComponent(req.body, {
        userId: (req as any).user.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: comp });
    } catch (err) { next(err); }
  }

  static async updateComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const comp = await PayrollConfigService.updateComponent(req.params.id, req.body, {
        userId: (req as any).user.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: comp });
    } catch (err) { next(err); }
  }

  static async retireComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const comp = await PayrollConfigService.retireComponent(req.params.id, {
        userId: (req as any).user.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: comp });
    } catch (err) { next(err); }
  }

  // ── Formulas ──

  static async getCurrentFormula(req: Request, res: Response, next: NextFunction) {
    try {
      const formula = await PayrollConfigService.getCurrentFormula();
      res.json({ success: true, data: formula });
    } catch (err) { next(err); }
  }

  static async getFormulaVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const formula = await PayrollConfigService.getFormulaVersion(parseInt(req.params.version));
      res.json({ success: true, data: formula });
    } catch (err) { next(err); }
  }

  static async getAllFormulas(req: Request, res: Response, next: NextFunction) {
    try {
      const formulas = await PayrollConfigService.getAllFormulas();
      res.json({ success: true, data: formulas });
    } catch (err) { next(err); }
  }

  static async createFormula(req: Request, res: Response, next: NextFunction) {
    try {
      const formula = await PayrollConfigService.createFormula(req.body, {
        userId: (req as any).user.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: formula });
    } catch (err) { next(err); }
  }

  // ── Tax Brackets ──

  static async getTaxBrackets(req: Request, res: Response, next: NextFunction) {
    try {
      const brackets = await PayrollConfigService.getTaxBrackets();
      res.json({ success: true, data: brackets });
    } catch (err) { next(err); }
  }

  static async getCurrentTaxBracket(req: Request, res: Response, next: NextFunction) {
    try {
      const bracket = await PayrollConfigService.getCurrentTaxBracket();
      res.json({ success: true, data: bracket });
    } catch (err) { next(err); }
  }

  static async createTaxBracket(req: Request, res: Response, next: NextFunction) {
    try {
      const bracket = await PayrollConfigService.createTaxBracket(req.body, {
        userId: (req as any).user.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: bracket });
    } catch (err) { next(err); }
  }

  // ── Pension Rules ──

  static async getPensionRules(req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await PayrollConfigService.getPensionRules();
      res.json({ success: true, data: rules });
    } catch (err) { next(err); }
  }

  static async getCurrentPensionRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await PayrollConfigService.getCurrentPensionRule();
      res.json({ success: true, data: rule });
    } catch (err) { next(err); }
  }

  static async createPensionRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await PayrollConfigService.createPensionRule(req.body, {
        userId: (req as any).user.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: rule });
    } catch (err) { next(err); }
  }

  // ── Dashboard ──

  static async getConfigDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const dashboard = await PayrollConfigService.getConfigDashboard();
      res.json({ success: true, data: dashboard });
    } catch (err) { next(err); }
  }
}
