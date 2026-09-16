import { Router } from 'express';
import { FinanceController } from './finance.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/periods', authorize(PERMISSIONS.PAYROLL_PERIOD_READ), FinanceController.getAllPeriods);
router.get('/periods/:id', authorize(PERMISSIONS.PAYROLL_PERIOD_READ), FinanceController.getPeriodById);
router.post('/periods', authorize(PERMISSIONS.SETTINGS_UPDATE), FinanceController.createPeriod);
router.put('/periods/:id/status', authorize(PERMISSIONS.SETTINGS_UPDATE), FinanceController.updatePeriodStatus);
router.put('/periods/:id/lock', authorize(PERMISSIONS.SETTINGS_UPDATE), FinanceController.lockPeriod);
router.put('/rates/:periodId', authorize(PERMISSIONS.GUARD_PAYROLL_RATES), FinanceController.setRates);
router.get('/rates/:periodId', authorize(PERMISSIONS.GUARD_PAYROLL_READ), FinanceController.getRates);

export default router;
