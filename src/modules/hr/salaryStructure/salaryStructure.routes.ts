import { Router } from 'express';
import { SalaryStructureController } from './salaryStructure.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/dashboard', authorize(PERMISSIONS.GUARD_PAYROLL_READ), SalaryStructureController.getDashboard);
router.get('/', authorize(PERMISSIONS.GUARD_PAYROLL_READ), SalaryStructureController.getAll);
router.get('/employee-type/:employeeType', authorize(PERMISSIONS.GUARD_PAYROLL_READ), SalaryStructureController.getCurrent);
router.get('/versions/:employeeType', authorize(PERMISSIONS.GUARD_PAYROLL_READ), SalaryStructureController.getVersions);
router.get('/:id', authorize(PERMISSIONS.GUARD_PAYROLL_READ), SalaryStructureController.getById);
router.post('/', authorize(PERMISSIONS.PAYROLL_CONFIG_MANAGE), SalaryStructureController.create);
router.put('/:id', authorize(PERMISSIONS.PAYROLL_CONFIG_MANAGE), SalaryStructureController.update);
router.put('/:id/retire', authorize(PERMISSIONS.PAYROLL_CONFIG_MANAGE), SalaryStructureController.retire);
router.post('/:id/duplicate', authorize(PERMISSIONS.PAYROLL_CONFIG_MANAGE), SalaryStructureController.duplicate);

export default router;
