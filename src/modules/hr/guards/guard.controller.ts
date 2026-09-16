import { Request, Response, NextFunction } from 'express';
import { GuardService } from './guard.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class GuardController {
  static async registerGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await GuardService.registerGuard(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async assignSite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const assignment = await GuardService.assignSite(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: assignment });
    } catch (error) { next(error); }
  }

  static async getGuardSites(req: Request, res: Response, next: NextFunction) {
    try {
      const sites = await GuardService.getGuardSites(req.params.guardId);
      res.json({ success: true, data: sites });
    } catch (error) { next(error); }
  }

  static async removeSiteAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const assignment = await GuardService.removeSiteAssignment(req.params.assignmentId, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: assignment });
    } catch (error) { next(error); }
  }

  static async getAllGuards(req: Request, res: Response, next: NextFunction) {
    try {
      const guards = await GuardService.getAllGuards();
      res.json({ success: true, data: guards });
    } catch (error) { next(error); }
  }

  static async getGuardDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const detail = await GuardService.getGuardDetail(req.params.employeeId);
      res.json({ success: true, data: detail });
    } catch (error) { next(error); }
  }

  static async updateGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const guard = await GuardService.updateGuard(req.params.employeeId, req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: guard });
    } catch (error) { next(error); }
  }

  static async updatePayRate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const assignment = await GuardService.updateGuardPayRate(req.params.assignmentId, req.body.hourlyRate, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: assignment });
    } catch (error) { next(error); }
  }

  static async setHomeSite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employee = await GuardService.setHomeSite(req.params.employeeId, req.body.homeSiteId, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: employee });
    } catch (error) { next(error); }
  }
}
