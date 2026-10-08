import { Router } from 'express';
import { RFQController } from './rfq.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/compare', authorize(PERMISSIONS.PURCHASE_READ), RFQController.compare);
router.get('/', authorize(PERMISSIONS.PURCHASE_READ), RFQController.getAll);
router.get('/:id', authorize(PERMISSIONS.PURCHASE_READ), RFQController.getById);

router.post('/', authorize(PERMISSIONS.PURCHASE_CREATE), RFQController.create);
router.put('/:id', authorize(PERMISSIONS.PURCHASE_UPDATE), RFQController.update);

router.post('/:id/submit', authorize(PERMISSIONS.PURCHASE_UPDATE), RFQController.submit);
router.post('/:id/send', authorize(PERMISSIONS.PURCHASE_UPDATE), RFQController.send);
router.post('/:id/quote', authorize(PERMISSIONS.PURCHASE_UPDATE), RFQController.recordQuotation);
router.post('/:id/approve', authorize(PERMISSIONS.PURCHASE_APPROVE), RFQController.approve);
router.post('/:id/reject', authorize(PERMISSIONS.PURCHASE_APPROVE), RFQController.reject);
router.post('/:id/convert-to-po', authorize(PERMISSIONS.PURCHASE_CREATE), RFQController.convertToPO);

export default router;
