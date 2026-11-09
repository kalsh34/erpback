import { Router } from 'express';
import { ProformaCompanyController } from './company.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();

router.use(authenticate);

// Company registration for proformas.
// Reads: service.read. Writes: service.manage (the marketing module bundle) OR
// proforma.issue — the issuing authority also has to be able to register the
// client it is about to quote. The CEO role stays read-only through the
// ROLE_MANDATORY_DENIES entries for both permissions.
router.get('/', authorize(PERMISSIONS.SERVICE_READ), ProformaCompanyController.getAll);
router.get('/:id', authorize(PERMISSIONS.SERVICE_READ), ProformaCompanyController.getById);
router.post('/', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ProformaCompanyController.create);
router.put('/:id', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ProformaCompanyController.update);
router.post('/:id/deactivate', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ProformaCompanyController.deactivate);

export default router;
