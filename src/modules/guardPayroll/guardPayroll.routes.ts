import { Router } from 'express';
import { GuardPayrollController } from './guardPayroll.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS, UserRole } from '../../types';
import { ApiError } from '../../common/ApiError';

const router = Router();
router.use(authenticate);
// Guard self-service never grants access to the all-employee payroll read surface.
router.get('/my', authorize(PERMISSIONS.GUARD_PAYROLL_READ), GuardPayrollController.myPayroll);
router.use((req, _res, next) => {
  if (req.user?.role === UserRole.GUARD) return next(ApiError.forbidden('Use My Payroll to view your own financial records.'));
  next();
});

const READ = PERMISSIONS.GUARD_PAYROLL_READ;
const RATES = PERMISSIONS.GUARD_PAYROLL_RATES;
const CALCULATE = PERMISSIONS.GUARD_PAYROLL_CALCULATE;
const CHECK = PERMISSIONS.GUARD_PAYROLL_CHECK;
const APPROVE = PERMISSIONS.GUARD_PAYROLL_APPROVE;
const PAY = PERMISSIONS.GUARD_PAYROLL_PAY;
const RETURN = PERMISSIONS.GUARD_PAYROLL_RETURN;

router.get('/status', authorize(READ), GuardPayrollController.status);
router.get('/readiness', authorize(READ), GuardPayrollController.readiness);

// Engine configuration (transport %, divisors).
router.get('/config', authorize(READ), GuardPayrollController.getConfig);
router.put('/config', authorize(RATES), GuardPayrollController.updateConfig);

// Effective-dated site compensation — the payroll rate source of truth.
router.get('/compensations', authorize(READ), GuardPayrollController.listCompensations);
router.post('/compensations', authorize(RATES), GuardPayrollController.createCompensation);
router.delete('/compensations/:id', authorize(RATES), GuardPayrollController.deleteCompensation);

// Runs: calculate, lifecycle, history.
router.get('/', authorize(READ), GuardPayrollController.list);
router.post('/generate/:periodKey', authorize(CALCULATE), GuardPayrollController.createRun);
router.post('/runs', authorize(CALCULATE), GuardPayrollController.createRun);
router.get('/runs', authorize(READ), GuardPayrollController.listRuns);
router.get('/runs/:id', authorize(READ), GuardPayrollController.getRun);
router.post('/runs/:id/recalculate', authorize(CALCULATE), GuardPayrollController.recalculateRun);
router.post('/runs/:id/submit', authorize(CALCULATE), GuardPayrollController.submitRun);
router.post('/runs/:id/check', authorize(CHECK), GuardPayrollController.checkRun);
router.post('/runs/:id/approve', authorize(APPROVE), GuardPayrollController.approveRun);
router.post('/runs/:id/return', authorize(RETURN), GuardPayrollController.returnRun);
router.post('/runs/:id/pay', authorize(PAY), GuardPayrollController.payRun);

router.get('/banks', authorize(READ), GuardPayrollController.banksInUse);
router.get('/runs/:id/export/bank', authorize(READ), GuardPayrollController.exportBank);
router.get('/runs/:id/export/tax', authorize(READ), GuardPayrollController.exportTax);
router.get('/runs/:id/export/pension', authorize(READ), GuardPayrollController.exportPension);

router.get('/records/:id', authorize(READ), GuardPayrollController.getRecord);
router.get('/records/:id/payslip', authorize(READ), GuardPayrollController.getPayslip);

// Attendance lock state for the attendance pages (read-level so Operations can see it).
router.get('/attendance-lock', authorize(READ), GuardPayrollController.attendanceLock);

export default router;
