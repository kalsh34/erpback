import { Router } from 'express';
import journalRoutes from './journal.routes';

const router = Router();
router.use('/journal', journalRoutes);

export default router;
