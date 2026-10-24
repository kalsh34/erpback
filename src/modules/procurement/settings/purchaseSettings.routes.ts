import { Router } from 'express';
import { PurchaseSettingsController } from './purchaseSettings.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.SETTINGS_READ), PurchaseSettingsController.get);
router.put('/', authorize(PERMISSIONS.SETTINGS_UPDATE), PurchaseSettingsController.update);

export default router;
