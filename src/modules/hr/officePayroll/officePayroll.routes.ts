import { Router } from 'express';
import { OfficePayrollController } from './officePayroll.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.GUARD_PAYROLL_READ), OfficePayrollController.getAll);
router.get('/:id', authorize(PERMISSIONS.GUARD_PAYROLL_READ), OfficePayrollController.getById);
router.post('/generate/:periodId', authorize(PERMISSIONS.OFFICE_PAYROLL_CREATE), OfficePayrollController.generate);
router.put('/:id/salary', authorize(PERMISSIONS.OFFICE_PAYROLL_CALCULATE), OfficePayrollController.updateSalaryInputs);
router.post('/:id/enter-ot', authorize(PERMISSIONS.OFFICE_PAYROLL_ENTER_OT), OfficePayrollController.enterOt);
router.post('/:id/calculate', authorize(PERMISSIONS.OFFICE_PAYROLL_CALCULATE), OfficePayrollController.calculate);
router.post('/:id/submit', authorize(PERMISSIONS.OFFICE_PAYROLL_SUBMIT), OfficePayrollController.submit);
router.post('/:id/check', authorize(PERMISSIONS.OFFICE_PAYROLL_CHECK), OfficePayrollController.check);
router.post('/:id/approve', authorize(PERMISSIONS.OFFICE_PAYROLL_APPROVE), OfficePayrollController.approve);
router.post('/:id/initiate-payment', authorize(PERMISSIONS.OFFICE_PAYROLL_PAY), OfficePayrollController.initiatePayment);
router.post('/:id/confirm-paid', authorize(PERMISSIONS.OFFICE_PAYROLL_PAY), OfficePayrollController.confirmPaid);
router.post('/:id/return', authorize(PERMISSIONS.OFFICE_PAYROLL_RETURN), OfficePayrollController.returnForCorrection);

export default router;
