import { Router } from 'express';
import { PayrollCommonController } from './payrollCommon.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

// Tax tables + pension rules (read for payroll viewers, write for rate managers).
router.get('/tax-brackets', authorize(PERMISSIONS.GUARD_PAYROLL_READ), PayrollCommonController.listTaxTables);
router.post('/tax-brackets', authorize(PERMISSIONS.GUARD_PAYROLL_RATES), PayrollCommonController.createTaxTable);
router.get('/pension-rules', authorize(PERMISSIONS.GUARD_PAYROLL_READ), PayrollCommonController.listPensionRules);
router.post('/pension-rules', authorize(PERMISSIONS.GUARD_PAYROLL_RATES), PayrollCommonController.createPensionRule);

// Employee deductions (loans / advances / penalties / other).
router.get('/deductions', authorize(PERMISSIONS.GUARD_PAYROLL_READ), PayrollCommonController.listDeductions);
router.post('/deductions', authorize(PERMISSIONS.GUARD_PAYROLL_RATES), PayrollCommonController.createDeduction);
router.post('/deductions/:id/cancel', authorize(PERMISSIONS.GUARD_PAYROLL_RATES), PayrollCommonController.cancelDeduction);

export default router;
