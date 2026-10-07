"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const user_routes_1 = __importDefault(require("./modules/hr/employees/user.routes"));
const employee_routes_1 = __importDefault(require("./modules/hr/employees/employee.routes"));
const site_routes_1 = __importDefault(require("./modules/hr/sites/site.routes"));
const company_routes_1 = __importDefault(require("./modules/hr/companies/company.routes"));
const guard_routes_1 = __importDefault(require("./modules/hr/guards/guard.routes"));
const audit_routes_1 = __importDefault(require("./modules/audit/audit.routes"));
const reports_routes_1 = __importDefault(require("./modules/reports/reports.routes"));
const reports2_routes_1 = __importDefault(require("./modules/reports2/reports2.routes"));
const staffAttendance_routes_1 = __importDefault(require("./modules/hr/staffAttendance/staffAttendance.routes"));
const guardShift_routes_1 = __importDefault(require("./modules/hr/guardAttendance/guardShift.routes"));
const guardAttendance_routes_1 = __importDefault(require("./modules/hr/guardAttendance/guardAttendance.routes"));
const notification_routes_1 = __importDefault(require("./modules/notifications/notification.routes"));
const contract_routes_1 = __importDefault(require("./modules/hr/contracts/contract.routes"));
const siteNotes_routes_1 = __importDefault(require("./modules/hr/sites/siteNotes.routes"));
const shift_routes_1 = __importDefault(require("./modules/hr/shifts/shift.routes"));
const candidate_routes_1 = __importDefault(require("./modules/hr/onboarding/candidate.routes"));
const performance_routes_1 = __importDefault(require("./modules/hr/performance/performance.routes"));
const guarantor_routes_1 = __importDefault(require("./modules/hr/guarantor/guarantor.routes"));
const rotation_routes_1 = __importDefault(require("./modules/hr/rotation/rotation.routes"));
const department_routes_1 = __importDefault(require("./modules/hr/organization/department.routes"));
const position_routes_1 = __importDefault(require("./modules/hr/organization/position.routes"));
const payGrade_routes_1 = __importDefault(require("./modules/hr/organization/payGrade.routes"));
const file_routes_1 = __importDefault(require("./modules/hr/files/file.routes"));
const staffPayroll_routes_1 = __importDefault(require("./modules/staffPayroll/staffPayroll.routes"));
const guardPayroll_routes_1 = __importDefault(require("./modules/guardPayroll/guardPayroll.routes"));
const payrollCommon_routes_1 = __importDefault(require("./modules/payrollCommon/payrollCommon.routes"));
const index_1 = __importDefault(require("./modules/inventory/index"));
const index_2 = __importDefault(require("./modules/sales-crm/index"));
const index_3 = __importDefault(require("./modules/procurement/index"));
const index_4 = __importDefault(require("./modules/manufacturing/index"));
const index_5 = __importDefault(require("./modules/projects/index"));
const index_6 = __importDefault(require("./modules/fleet/index"));
const app = (0, express_1.default)();
// CORS_ORIGIN accepts a comma separated list of the frontend origins allowed to
// call this API, e.g. CORS_ORIGIN=https://my-frontend.onrender.com,http://localhost:3000
// Defaults to "*" (any origin) so the deployed API keeps working out of the box.
const corsOrigins = env_1.config.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowAnyOrigin = corsOrigins.length === 0 || corsOrigins.includes('*');
app.use((0, cors_1.default)(allowAnyOrigin ? {} : { origin: corsOrigins }));
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.use(requestLogger_1.requestLogger);
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Vital Security API is running', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/employees', employee_routes_1.default);
app.use('/api/sites', site_routes_1.default);
app.use('/api/companies', company_routes_1.default);
app.use('/api/guards', guard_routes_1.default);
app.use('/api/audit-logs', audit_routes_1.default);
app.use('/api/reports', reports_routes_1.default);
app.use('/api/module-reports', reports2_routes_1.default);
app.use('/api/staff-attendance', staffAttendance_routes_1.default);
app.use('/api/attendance/shifts', guardShift_routes_1.default); // before /api/attendance so /shifts/* wins over /:id/*
app.use('/api/attendance', guardAttendance_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/contracts', contract_routes_1.default);
app.use('/api/site-notes', siteNotes_routes_1.default);
app.use('/api/shifts', shift_routes_1.default);
app.use('/api/candidates', candidate_routes_1.default);
app.use('/api/performance', performance_routes_1.default);
app.use('/api/guarantors', guarantor_routes_1.default);
app.use('/api/rotations', rotation_routes_1.default);
app.use('/api/departments', department_routes_1.default);
app.use('/api/positions', position_routes_1.default);
app.use('/api/pay-grades', payGrade_routes_1.default);
app.use('/api/files', file_routes_1.default);
// Payroll v2 — separate systems. Logic to be defined by the owner.
app.use('/api/staff-payroll', staffPayroll_routes_1.default);
app.use('/api/office-payroll', staffPayroll_routes_1.default);
app.use('/api/guard-payroll', guardPayroll_routes_1.default);
app.use('/api/payroll-common', payrollCommon_routes_1.default);
app.use('/api/v2/inventory', index_1.default);
app.use('/api/v2/sales-crm', index_2.default);
app.use('/api/v2/procurement', index_3.default);
app.use('/api/v2/manufacturing', index_4.default);
app.use('/api/v2/projects', index_5.default);
app.use('/api/v2/fleet', index_6.default);
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map