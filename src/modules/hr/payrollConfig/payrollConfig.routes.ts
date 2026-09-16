import { Router } from 'express';
import { PayrollConfigController } from './payrollConfig.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);
router.use(authorize(PERMISSIONS.PAYROLL_CONFIG_MANAGE));

router.get('/dashboard', PayrollConfigController.getConfigDashboard);

router.get('/components', PayrollConfigController.getComponents);
router.get('/components/:id', PayrollConfigController.getComponentById);
router.post('/components', PayrollConfigController.createComponent);
router.put('/components/:id', PayrollConfigController.updateComponent);
router.put('/components/:id/retire', PayrollConfigController.retireComponent);

router.get('/formulas', PayrollConfigController.getAllFormulas);
router.get('/formulas/current', PayrollConfigController.getCurrentFormula);
router.get('/formulas/:version', PayrollConfigController.getFormulaVersion);
router.post('/formulas', PayrollConfigController.createFormula);

router.get('/tax-brackets', PayrollConfigController.getTaxBrackets);
router.get('/tax-brackets/current', PayrollConfigController.getCurrentTaxBracket);
router.post('/tax-brackets', PayrollConfigController.createTaxBracket);

router.get('/pension-rules', PayrollConfigController.getPensionRules);
router.get('/pension-rules/current', PayrollConfigController.getCurrentPensionRule);
router.post('/pension-rules', PayrollConfigController.createPensionRule);

export default router;
