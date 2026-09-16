import { Router } from 'express';
import { RulesController } from './rules.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

router.get('/tax-brackets', authorize(PERMISSIONS.SETTINGS_READ), RulesController.getTaxBrackets);
router.get('/tax-brackets/current', authorize(PERMISSIONS.SETTINGS_READ), RulesController.getCurrentTaxBracket);
router.post('/tax-brackets', authorize(PERMISSIONS.SETTINGS_UPDATE), RulesController.createTaxBracket);
router.get('/pension-rules', authorize(PERMISSIONS.SETTINGS_READ), RulesController.getPensionRules);
router.get('/pension-rules/current', authorize(PERMISSIONS.SETTINGS_READ), RulesController.getCurrentPensionRule);
router.post('/pension-rules', authorize(PERMISSIONS.SETTINGS_UPDATE), RulesController.createPensionRule);

export default router;
