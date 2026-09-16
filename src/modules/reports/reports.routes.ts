import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

router.get('/payroll-summary', authorize(PERMISSIONS.REPORT_READ), ReportsController.getPayrollSummary);
router.get('/site-labor-cost', authorize(PERMISSIONS.REPORT_READ), ReportsController.getSiteLaborCost);
router.get('/payment-history', authorize(PERMISSIONS.REPORT_READ), ReportsController.getPaymentHistory);

export default router;
