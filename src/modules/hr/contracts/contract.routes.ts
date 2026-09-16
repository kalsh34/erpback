import { Router } from 'express';
import { ContractController } from './contract.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.EMPLOYEE_READ), ContractController.getAll);
router.get('/employee/:employeeId', authorize(PERMISSIONS.EMPLOYEE_READ), ContractController.getByEmployee);
router.post('/', authorize(PERMISSIONS.EMPLOYEE_CREATE), ContractController.create);
router.put('/:id', authorize(PERMISSIONS.EMPLOYEE_UPDATE), ContractController.update);
router.delete('/:id', authorize(PERMISSIONS.EMPLOYEE_UPDATE), ContractController.delete);

export default router;
