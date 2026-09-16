import { Router } from 'express';
import { GuardController } from './guard.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.EMPLOYEE_READ), GuardController.getAllGuards);
router.post('/register', authorize(PERMISSIONS.GUARD_REGISTER), GuardController.registerGuard);
router.get('/:employeeId', authorize(PERMISSIONS.EMPLOYEE_READ), GuardController.getGuardDetail);
router.put('/:employeeId', authorize(PERMISSIONS.EMPLOYEE_UPDATE), GuardController.updateGuard);
router.post('/assign-site', authorize(PERMISSIONS.GUARD_ASSIGN_SITE), GuardController.assignSite);
router.get('/:guardId/sites', authorize(PERMISSIONS.EMPLOYEE_READ), GuardController.getGuardSites);
router.delete('/site-assignment/:assignmentId', authorize(PERMISSIONS.GUARD_ASSIGN_SITE), GuardController.removeSiteAssignment);
router.put('/pay-rate/:assignmentId', authorize(PERMISSIONS.GUARD_PAYROLL_RATES), GuardController.updatePayRate);
router.put('/:employeeId/home-site', authorize(PERMISSIONS.EMPLOYEE_UPDATE), GuardController.setHomeSite);

export default router;
