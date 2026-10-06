import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';
import * as controller from './guarantor.controller';

const router = Router();

router.use(authenticate);

router.get('/employee/:employeeId', authorize(PERMISSIONS.GUARANTOR_READ), controller.getByEmployeeId);
router.get('/:id', authorize(PERMISSIONS.GUARANTOR_READ), controller.getById);
router.post('/', authorize(PERMISSIONS.GUARANTOR_MANAGE), controller.create);
router.put('/:id', authorize(PERMISSIONS.GUARANTOR_MANAGE), controller.update);
router.put('/:id/verify', authorize(PERMISSIONS.GUARANTOR_MANAGE), controller.verify);
router.put('/:id/reject', authorize(PERMISSIONS.EMPLOYEE_UPDATE), controller.reject);
router.delete('/:id', authorize(PERMISSIONS.EMPLOYEE_UPDATE), controller.remove);

export default router;
