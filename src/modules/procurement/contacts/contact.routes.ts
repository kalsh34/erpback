import { Router } from 'express';
import { ContactController } from './contact.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.CONTACT_READ), ContactController.getAll);
router.get('/:id', authorize(PERMISSIONS.CONTACT_READ), ContactController.getById);
router.post('/', authorize(PERMISSIONS.CONTACT_MANAGE), ContactController.create);
router.put('/:id', authorize(PERMISSIONS.CONTACT_MANAGE), ContactController.update);
router.delete('/:id', authorize(PERMISSIONS.CONTACT_MANAGE), ContactController.delete);

export default router;
