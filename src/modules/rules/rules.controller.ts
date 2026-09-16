import { Request, Response, NextFunction } from 'express';
import { RulesService } from './rules.service';

export class RulesController {
  static async getTaxBrackets(_req: Request, res: Response, next: NextFunction) {
    try {
      const brackets = await RulesService.getTaxBrackets();
      res.json({ success: true, data: brackets });
    } catch (error) { next(error); }
  }

  static async getCurrentTaxBracket(_req: Request, res: Response, next: NextFunction) {
    try {
      const bracket = await RulesService.getCurrentTaxBracket();
      res.json({ success: true, data: bracket });
    } catch (error) { next(error); }
  }

  static async createTaxBracket(req: Request, res: Response, next: NextFunction) {
    try {
      const bracket = await RulesService.createTaxBracket(req.body);
      res.status(201).json({ success: true, data: bracket });
    } catch (error) { next(error); }
  }

  static async getPensionRules(_req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await RulesService.getPensionRules();
      res.json({ success: true, data: rules });
    } catch (error) { next(error); }
  }

  static async getCurrentPensionRule(_req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await RulesService.getCurrentPensionRule();
      res.json({ success: true, data: rule });
    } catch (error) { next(error); }
  }

  static async createPensionRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await RulesService.createPensionRule(req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error) { next(error); }
  }
}
