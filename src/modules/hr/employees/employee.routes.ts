import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/guards', authorize(PERMISSIONS.EMPLOYEE_READ), EmployeeController.getGuards);
router.get('/office-staff', authorize(PERMISSIONS.EMPLOYEE_READ), EmployeeController.getOfficeStaff);
router.get('/export', authorize(PERMISSIONS.EMPLOYEE_READ), EmployeeController.exportCsv);
router.get('/analytics/summary', authorize(PERMISSIONS.EMPLOYEE_READ), EmployeeController.analytics);
router.get('/', authorize(PERMISSIONS.EMPLOYEE_READ), EmployeeController.getAll);
router.get('/:id', authorize(PERMISSIONS.EMPLOYEE_READ), EmployeeController.getById);
router.post('/', authorize(PERMISSIONS.EMPLOYEE_CREATE), EmployeeController.create);
router.put('/:id', authorize(PERMISSIONS.EMPLOYEE_UPDATE), EmployeeController.update);
router.put('/:id/status', authorize(PERMISSIONS.EMPLOYEE_UPDATE), EmployeeController.changeStatus);
router.delete('/:id', authorize(PERMISSIONS.EMPLOYEE_DELETE), EmployeeController.delete);

export default router;
