import { Router } from 'express';
import { CompanyController } from './company.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.COMPANY_READ), CompanyController.getAll);
router.get('/:id/detail', authorize(PERMISSIONS.COMPANY_READ), CompanyController.detail);
router.get('/:id', authorize(PERMISSIONS.COMPANY_READ), CompanyController.getById);
router.post('/', authorize(PERMISSIONS.COMPANY_CREATE), CompanyController.create);
router.put('/:id', authorize(PERMISSIONS.COMPANY_UPDATE), CompanyController.update);
router.delete('/:id', authorize(PERMISSIONS.COMPANY_UPDATE), CompanyController.delete);

export default router;
