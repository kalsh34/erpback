import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = (err as any).statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
