import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return next({
      statusCode: 400,
      message: messages.join(', '),
      isOperational: true,
    } as any);
  }
  next();
};
