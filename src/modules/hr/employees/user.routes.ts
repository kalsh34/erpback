import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/roles', UserController.getRoles);
router.get('/', authorize(PERMISSIONS.USER_READ), UserController.getAll);
router.get('/:id', authorize(PERMISSIONS.USER_READ), UserController.getById);
router.post('/', authorize(PERMISSIONS.USER_CREATE), UserController.create);
router.put('/:id', authorize(PERMISSIONS.USER_UPDATE), UserController.update);
router.delete('/:id', authorize(PERMISSIONS.USER_DELETE), UserController.delete);
router.put('/:id/activate', authorize(PERMISSIONS.USER_UPDATE), UserController.activate);
router.put('/:id/deactivate', authorize(PERMISSIONS.USER_UPDATE), UserController.deactivate);

export default router;
