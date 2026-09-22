import { Router } from 'express';
import { PayrollRunController } from './payrollRun.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.GUARD_PAYROLL_READ), PayrollRunController.getAll);
router.get('/:id', authorize(PERMISSIONS.GUARD_PAYROLL_READ), PayrollRunController.getById);
router.post('/', authorize(PERMISSIONS.OFFICE_PAYROLL_CREATE), PayrollRunController.create);
router.post('/:id/approve', authorize(PERMISSIONS.OFFICE_PAYROLL_APPROVE), PayrollRunController.approve);
router.post('/:id/mark-paid', authorize(PERMISSIONS.OFFICE_PAYROLL_PAY), PayrollRunController.markPaid);
router.delete('/:id', authorize(PERMISSIONS.OFFICE_PAYROLL_CREATE), PayrollRunController.remove);

export default router;