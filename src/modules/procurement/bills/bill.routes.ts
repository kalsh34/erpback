import { Router } from 'express';
import { BillController } from './bill.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.PURCHASE_READ), BillController.getAll);
router.get('/:id', authorize(PERMISSIONS.PURCHASE_READ), BillController.getById);

router.post('/', authorize(PERMISSIONS.BILL_MANAGE), BillController.create);
router.post('/:id/post', authorize(PERMISSIONS.BILL_MANAGE), BillController.postBill);
router.post('/:id/payments', authorize(PERMISSIONS.BILL_MANAGE), BillController.recordPayment);

export default router;
