import { Router, Request, Response } from 'express';

export function createStubRouter(moduleName: string): Router {
  const router = Router();

  router.all('*', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      message: `${moduleName} module is not yet implemented`,
    });
  });

  return router;
}
