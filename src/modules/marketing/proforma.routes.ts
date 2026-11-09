import { Router } from 'express';
import { ProformaController } from './proforma.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();

router.use(authenticate);

// Proforma lifecycle (server-controlled):
//   POST /              create DRAFT (number PF/VGT/<year>/<nnnn> allocated)
//   PUT  /:id           edit a DRAFT only (issued documents are frozen)
//   POST /:id/issue     DRAFT → ISSUED (manager/issuing authority only)
//   POST /:id/status    accept / expire / convert / cancel per transition map
router.get('/', authorize(PERMISSIONS.SERVICE_READ), ProformaController.getAll);
router.get('/:id', authorize(PERMISSIONS.SERVICE_READ), ProformaController.getById);
router.post('/', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ProformaController.create);
router.put('/:id', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ProformaController.update);
router.post('/:id/issue', authorize(PERMISSIONS.PROFORMA_ISSUE), ProformaController.issue);
router.post('/:id/status', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ProformaController.setStatus);

export default router;
