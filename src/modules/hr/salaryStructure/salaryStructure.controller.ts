import { Request, Response, NextFunction } from 'express';
import { SalaryStructureService } from './salaryStructure.service';

export class SalaryStructureController {
  static async getAll(req: QueryRequest, res: Response, next: NextFunction) {
    try {
      const { employeeType, isCurrent } = req.query;
      const structures = await SalaryStructureService.getAll(
        employeeType as string,
        isCurrent === 'true' ? true : isCurrent === 'false' ? false : undefined
      );
      res.json({ data: structures });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const structure = await SalaryStructureService.getById(req.params.id);
      res.json({ data: structure });
    } catch (err) {
      next(err);
    }
  }

  static async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const structure = await SalaryStructureService.getCurrent(req.params.employeeType);
      res.json({ data: structure });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const dashboard = await SalaryStructureService.getDashboard();
      res.json({ data: dashboard });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const structure = await SalaryStructureService.create({
        ...req.body,
        effectiveFrom: req.body.effectiveFrom || new Date(),
        createdById: userId,
      });
      res.status(201).json({ data: structure });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const structure = await SalaryStructureService.update(req.params.id, req.body);
      res.json({ data: structure });
    } catch (err) {
      next(err);
    }
  }

  static async retire(req: Request, res: Response, next: NextFunction) {
    try {
      const structure = await SalaryStructureService.retire(req.params.id);
      res.json({ data: structure });
    } catch (err) {
      next(err);
    }
  }

  static async getVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const versions = await SalaryStructureService.getVersions(req.params.employeeType);
      res.json({ data: versions });
    } catch (err) {
      next(err);
    }
  }

  static async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const structure = await SalaryStructureService.duplicate(req.params.id, userId);
      res.status(201).json({ data: structure });
    } catch (err) {
      next(err);
    }
  }
}

interface QueryRequest extends Request {
  query: {
    employeeType?: string;
    isCurrent?: string;
  };
}
