import { Request, Response, NextFunction } from 'express';
import { GuarantorService } from './guarantor.service';

export const getByEmployeeId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await GuarantorService.getByEmployeeId(req.params.employeeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await GuarantorService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await GuarantorService.create(req.body, {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await GuarantorService.update(req.params.id, req.body, {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const verify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await GuarantorService.verify(req.params.id, user._id, {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const reject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await GuarantorService.reject(req.params.id, req.body.reason, {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    await GuarantorService.delete(req.params.id, {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ success: true, message: 'Guarantor deleted' });
  } catch (err) { next(err); }
};
