import { Router } from 'express';
import { StaffPayrollController } from './staffPayroll.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

const READ = PERMISSIONS.OFFICE_PAYROLL_READ;
const CALCULATE = PERMISSIONS.OFFICE_PAYROLL_CALCULATE;
const SUBMIT = PERMISSIONS.OFFICE_PAYROLL_SUBMIT;
const CHECK = PERMISSIONS.OFFICE_PAYROLL_CHECK;
const APPROVE = PERMISSIONS.OFFICE_PAYROLL_APPROVE;
const PAY = PERMISSIONS.OFFICE_PAYROLL_PAY;
const RETURN = PERMISSIONS.OFFICE_PAYROLL_RETURN;
const ENTER_OT = PERMISSIONS.OFFICE_PAYROLL_ENTER_OT;
const RATES = PERMISSIONS.OFFICE_PAYROLL_RATES;

router.get('/status', authorize(READ), StaffPayrollController.status);

// Runs: calculate, lifecycle, history.
router.get('/', authorize(READ), StaffPayrollController.list);
router.post('/generate/:periodKey', authorize(CALCULATE), StaffPayrollController.createRun);
router.post('/runs', authorize(CALCULATE), StaffPayrollController.createRun);
router.get('/runs', authorize(READ), StaffPayrollController.listRuns);
router.get('/runs/:id', authorize(READ), StaffPayrollController.getRun);
router.post('/runs/:id/recalculate', authorize(CALCULATE), StaffPayrollController.recalculateRun);
router.post('/runs/:id/submit', authorize(SUBMIT), StaffPayrollController.submitRun);
router.post('/runs/:id/check', authorize(CHECK), StaffPayrollController.checkRun);
router.post('/runs/:id/approve', authorize(APPROVE), StaffPayrollController.approveRun);
router.post('/runs/:id/return', authorize(RETURN), StaffPayrollController.returnRun);
router.post('/runs/:id/pay', authorize(PAY), StaffPayrollController.payRun);

router.get('/runs/:id/export/bank', authorize(READ), StaffPayrollController.exportBank);
router.get('/runs/:id/export/tax', authorize(READ), StaffPayrollController.exportTax);
router.get('/runs/:id/export/pension', authorize(READ), StaffPayrollController.exportPension);

router.get('/records/:id', authorize(READ), StaffPayrollController.getRecord);
router.get('/records/:id/payslip', authorize(READ), StaffPayrollController.getPayslip);

// Overtime (enters Gross and Taxable earnings) and bonus (outside the formula).
router.get('/overtime', authorize(READ), StaffPayrollController.listOvertime);
router.post('/overtime', authorize(ENTER_OT), StaffPayrollController.saveOvertime);
router.post('/overtime/:id/cancel', authorize(ENTER_OT), StaffPayrollController.cancelOvertime);

router.get('/bonuses', authorize(READ), StaffPayrollController.listBonuses);
router.post('/bonuses', authorize(RATES), StaffPayrollController.saveBonus);
router.post('/bonuses/:id/cancel', authorize(RATES), StaffPayrollController.cancelBonus);

export default router;
