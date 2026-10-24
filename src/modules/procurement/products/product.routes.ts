import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.PRODUCT_READ), ProductController.getAll);
router.get('/:id', authorize(PERMISSIONS.PRODUCT_READ), ProductController.getById);
router.post('/', authorize(PERMISSIONS.PRODUCT_MANAGE), ProductController.create);
router.put('/:id', authorize(PERMISSIONS.PRODUCT_MANAGE), ProductController.update);
router.delete('/:id', authorize(PERMISSIONS.PRODUCT_MANAGE), ProductController.delete);

export default router;
