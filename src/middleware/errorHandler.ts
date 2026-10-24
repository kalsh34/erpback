import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const code = (err as Error & { code?: number }).code;
  const statusCode = (err as Error & { statusCode?: number }).statusCode
    || (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : code === 11000 ? 409 : 500);
  const message = code === 11000 ? 'A record with this identifier already exists. Refresh and review the existing record.' : err.message || 'Internal server error';

  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (statusCode === 500) console.error(err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    error: statusCode === 500 && process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
 