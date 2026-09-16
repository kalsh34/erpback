import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/hr/employees/user.routes';
import employeeRoutes from './modules/hr/employees/employee.routes';
import siteRoutes from './modules/hr/sites/site.routes';
import guardRoutes from './modules/hr/guards/guard.routes';
import attendanceRoutes from './modules/hr/attendance/attendance.routes';
import guardPayrollRoutes from './modules/hr/guardPayroll/guardPayroll.routes';
import officePayrollRoutes from './modules/hr/officePayroll/officePayroll.routes';
import financeRoutes from './modules/hr/finance/finance.routes';
import rulesRoutes from './modules/rules/rules.routes';
import auditRoutes from './modules/audit/audit.routes';
import reportsRoutes from './modules/reports/reports.routes';
import staffAttendanceRoutes from './modules/hr/staffAttendance/staffAttendance.routes';
import contractRoutes from './modules/hr/contracts/contract.routes';
import payrollConfigRoutes from './modules/hr/payrollConfig/payrollConfig.routes';
import siteNotesRoutes from './modules/hr/sites/siteNotes.routes';
import shiftRoutes from './modules/hr/shifts/shift.routes';
import candidateRoutes from './modules/hr/onboarding/candidate.routes';
import performanceRoutes from './modules/hr/performance/performance.routes';
import guarantorRoutes from './modules/hr/guarantor/guarantor.routes';
import rotationRoutes from './modules/hr/rotation/rotation.routes';
import salaryStructureRoutes from './modules/hr/salaryStructure/salaryStructure.routes';
import departmentRoutes from './modules/hr/organization/department.routes';
import positionRoutes from './modules/hr/organization/position.routes';
import fileRoutes from './modules/hr/files/file.routes';

import financeAccountingStub from './modules/finance-accounting/index';
import journalRoutes from './modules/finance-accounting/journal.routes';
import inventoryStub from './modules/inventory/index';
import salesCrmStub from './modules/sales-crm/index';
import procurementStub from './modules/procurement/index';
import manufacturingStub from './modules/manufacturing/index';
import projectsStub from './modules/projects/index';
import fleetStub from './modules/fleet/index';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(requestLogger);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Vital Security API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/guards', guardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/guard-payroll', guardPayrollRoutes);
app.use('/api/office-payroll', officePayrollRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/staff-attendance', staffAttendanceRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/admin/payroll-config', payrollConfigRoutes);
app.use('/api/site-notes', siteNotesRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/guarantors', guarantorRoutes);
app.use('/api/rotations', rotationRoutes);
app.use('/api/salary-structures', salaryStructureRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/files', fileRoutes);

app.use('/api/v2/finance-accounting', financeAccountingStub);
app.use('/api/journal', journalRoutes);
app.use('/api/v2/inventory', inventoryStub);
app.use('/api/v2/sales-crm', salesCrmStub);
app.use('/api/v2/procurement', procurementStub);
app.use('/api/v2/manufacturing', manufacturingStub);
app.use('/api/v2/projects', projectsStub);
app.use('/api/v2/fleet', fleetStub);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

export default app;
