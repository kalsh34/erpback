import { Router } from 'express';
import { ProformaController } from './proforma.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();

router.use(authenticate);

// Proformas (Phase C of Proposal & Proforma Management).
// Reads are gated on SERVICE_READ; draft management (create/edit/void/amend)
// on SERVICE_MANAGE — the same module bundle as the Phase A service library.
// Approving + issuing is a MANAGER-ONLY action gated on the dedicated
// PROFORMA_ISSUE permission, which is NOT part of any module bundle: holding
// a marketing grant can never confer it, so module grants cannot punch
// through to issuance. (Phase C policy correction.)
// Lifecycle is server-controlled:
//   POST /              create DRAFT (number allocated)
//   PUT  /:id           edit DRAFT only (discount changes additionally require
//                       PROFORMA_DISCOUNT — enforced inside the service)
//   POST /:id/issue     DRAFT → ISSUED (+ auto-supersede the amended parent);
//                       records the approving/issuing actor + audit event
//   POST /:id/void      DRAFT → VOID
//   POST /:id/amend     ISSUED → fresh DRAFT revision (issued docs immutable)
router.get('/', authorize(PERMISSIONS.SERVICE_READ), ProformaController.getAll);
router.get('/:id', authorize(PERMISSIONS.SERVICE_READ), ProformaController.getById);
router.post('/', authorize(PERMISSIONS.SERVICE_MANAGE), ProformaController.create);
router.put('/:id', authorize(PERMISSIONS.SERVICE_MANAGE), ProformaController.update);
router.post('/:id/issue', authorize(PERMISSIONS.PROFORMA_ISSUE), ProformaController.issue);
router.post('/:id/void', authorize(PERMISSIONS.SERVICE_MANAGE), ProformaController.void);
router.post('/:id/amend', authorize(PERMISSIONS.SERVICE_MANAGE), ProformaController.amend);

export default router;
