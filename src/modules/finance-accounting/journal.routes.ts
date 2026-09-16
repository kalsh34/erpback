import { Router } from 'express';
import { JournalController } from './journal.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

router.get('/dashboard', authorize(PERMISSIONS.REPORT_READ), JournalController.getDashboardSummary);
router.get('/accounts/summary', authorize(PERMISSIONS.REPORT_READ), JournalController.getAccountSummary);
router.get('/', authorize(PERMISSIONS.REPORT_READ), JournalController.getAll);
router.get('/:id', authorize(PERMISSIONS.REPORT_READ), JournalController.getById);
router.post('/', authorize(PERMISSIONS.GUARD_PAYROLL_PAY), JournalController.createEntry);
router.put('/:id/void', authorize(PERMISSIONS.GUARD_PAYROLL_PAY), JournalController.voidEntry);

export default router;
