"use strict";
// ============================================================
// Vital Security PLC — Payroll System — Shared Types
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSIONS = exports.PensionTaxBase = exports.LoanStatus = exports.PaymentMethod = exports.StaffAttendanceStatus = exports.RotationGuardStatus = exports.RotationStatus = exports.ShiftAssignmentSource = exports.AttendanceSource = exports.AttendanceStatus = exports.PayrollRecordStatus = exports.PayrollPeriodStatus = exports.SiteStatus = exports.SiteType = exports.EmploymentType = exports.GuardPosition = exports.Gender = exports.EmployeeStatus = exports.EmployeeCategory = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["SYSTEM_ADMIN"] = "SYSTEM_ADMIN";
    UserRole["HR_ADMIN"] = "HR_ADMIN";
    UserRole["FINANCE_OFFICER"] = "FINANCE_OFFICER";
    UserRole["OPERATIONS"] = "OPERATIONS";
    UserRole["GUARD"] = "GUARD";
    UserRole["HEAD"] = "HEAD";
    UserRole["CEO"] = "CEO";
})(UserRole || (exports.UserRole = UserRole = {}));
var EmployeeCategory;
(function (EmployeeCategory) {
    EmployeeCategory["GUARD"] = "GUARD";
    EmployeeCategory["OFFICE_STAFF"] = "OFFICE_STAFF";
})(EmployeeCategory || (exports.EmployeeCategory = EmployeeCategory = {}));
var EmployeeStatus;
(function (EmployeeStatus) {
    EmployeeStatus["ACTIVE"] = "ACTIVE";
    EmployeeStatus["INACTIVE"] = "INACTIVE";
    EmployeeStatus["TERMINATED"] = "TERMINATED";
    EmployeeStatus["ON_LEAVE"] = "ON_LEAVE";
    EmployeeStatus["CONTRACTED"] = "CONTRACTED";
})(EmployeeStatus || (exports.EmployeeStatus = EmployeeStatus = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
})(Gender || (exports.Gender = Gender = {}));
var GuardPosition;
(function (GuardPosition) {
    GuardPosition["GUARD"] = "GUARD";
    GuardPosition["SITE_LEADER"] = "SITE_LEADER";
})(GuardPosition || (exports.GuardPosition = GuardPosition = {}));
var EmploymentType;
(function (EmploymentType) {
    EmploymentType["PERMANENT"] = "PERMANENT";
    EmploymentType["CONTRACT"] = "CONTRACT";
    EmploymentType["TEMPORARY"] = "TEMPORARY";
})(EmploymentType || (exports.EmploymentType = EmploymentType = {}));
var SiteType;
(function (SiteType) {
    SiteType["COMMERCIAL"] = "COMMERCIAL";
    SiteType["RESIDENTIAL"] = "RESIDENTIAL";
    SiteType["INDUSTRIAL"] = "INDUSTRIAL";
    SiteType["GOVERNMENT"] = "GOVERNMENT";
})(SiteType || (exports.SiteType = SiteType = {}));
var SiteStatus;
(function (SiteStatus) {
    SiteStatus["ACTIVE"] = "ACTIVE";
    SiteStatus["INACTIVE"] = "INACTIVE";
    SiteStatus["SUSPENDED"] = "SUSPENDED";
})(SiteStatus || (exports.SiteStatus = SiteStatus = {}));
var PayrollPeriodStatus;
(function (PayrollPeriodStatus) {
    PayrollPeriodStatus["DRAFT"] = "DRAFT";
    PayrollPeriodStatus["OPEN"] = "OPEN";
    PayrollPeriodStatus["CLOSED"] = "CLOSED";
    PayrollPeriodStatus["LOCKED"] = "LOCKED";
})(PayrollPeriodStatus || (exports.PayrollPeriodStatus = PayrollPeriodStatus = {}));
var PayrollRecordStatus;
(function (PayrollRecordStatus) {
    PayrollRecordStatus["DRAFT"] = "DRAFT";
    PayrollRecordStatus["CALCULATED"] = "CALCULATED";
    PayrollRecordStatus["SUBMITTED"] = "SUBMITTED";
    PayrollRecordStatus["CHECKED"] = "CHECKED";
    PayrollRecordStatus["APPROVED"] = "APPROVED";
    PayrollRecordStatus["PAYMENT_PROCESSING"] = "PAYMENT_PROCESSING";
    PayrollRecordStatus["PAID"] = "PAID";
    PayrollRecordStatus["RETURNED"] = "RETURNED";
    PayrollRecordStatus["CANCELLED"] = "CANCELLED";
})(PayrollRecordStatus || (exports.PayrollRecordStatus = PayrollRecordStatus = {}));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["CLOCKED_IN"] = "CLOCKED_IN";
    AttendanceStatus["CLOCKED_OUT"] = "CLOCKED_OUT";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
var AttendanceSource;
(function (AttendanceSource) {
    AttendanceSource["SYSTEM"] = "SYSTEM";
    AttendanceSource["SELF_CLOCK"] = "SELF_CLOCK";
    AttendanceSource["OPERATIONS_EDIT"] = "OPERATIONS_EDIT";
    AttendanceSource["HR_MANUAL"] = "HR_MANUAL";
    AttendanceSource["MANUAL_ENTRY"] = "MANUAL_ENTRY";
    AttendanceSource["ROTATION"] = "ROTATION";
})(AttendanceSource || (exports.AttendanceSource = AttendanceSource = {}));
var ShiftAssignmentSource;
(function (ShiftAssignmentSource) {
    ShiftAssignmentSource["MANUAL"] = "MANUAL";
    ShiftAssignmentSource["ROTATION"] = "ROTATION";
})(ShiftAssignmentSource || (exports.ShiftAssignmentSource = ShiftAssignmentSource = {}));
var RotationStatus;
(function (RotationStatus) {
    RotationStatus["DRAFT"] = "DRAFT";
    RotationStatus["ACTIVE"] = "ACTIVE";
    RotationStatus["PAUSED"] = "PAUSED";
    RotationStatus["ARCHIVED"] = "ARCHIVED";
})(RotationStatus || (exports.RotationStatus = RotationStatus = {}));
var RotationGuardStatus;
(function (RotationGuardStatus) {
    RotationGuardStatus["ACTIVE"] = "ACTIVE";
    RotationGuardStatus["PAUSED"] = "PAUSED";
    RotationGuardStatus["REMOVED"] = "REMOVED";
})(RotationGuardStatus || (exports.RotationGuardStatus = RotationGuardStatus = {}));
var StaffAttendanceStatus;
(function (StaffAttendanceStatus) {
    StaffAttendanceStatus["PRESENT"] = "PRESENT";
    StaffAttendanceStatus["ABSENT"] = "ABSENT";
    StaffAttendanceStatus["PAID_LEAVE"] = "PAID_LEAVE";
    StaffAttendanceStatus["UNPAID_LEAVE"] = "UNPAID_LEAVE";
    StaffAttendanceStatus["SICK_LEAVE"] = "SICK_LEAVE";
    StaffAttendanceStatus["HALF_DAY"] = "HALF_DAY";
    StaffAttendanceStatus["HOLIDAY"] = "HOLIDAY";
    StaffAttendanceStatus["WEEKEND"] = "WEEKEND";
})(StaffAttendanceStatus || (exports.StaffAttendanceStatus = StaffAttendanceStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["CASH"] = "CASH";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var LoanStatus;
(function (LoanStatus) {
    LoanStatus["ACTIVE"] = "ACTIVE";
    LoanStatus["PAID_OFF"] = "PAID_OFF";
    LoanStatus["WRITTEN_OFF"] = "WRITTEN_OFF";
})(LoanStatus || (exports.LoanStatus = LoanStatus = {}));
var PensionTaxBase;
(function (PensionTaxBase) {
    PensionTaxBase["NORMAL_SALARY_ONLY"] = "NORMAL_SALARY_ONLY";
    PensionTaxBase["GROSS_PAY"] = "GROSS_PAY";
})(PensionTaxBase || (exports.PensionTaxBase = PensionTaxBase = {}));
// --- Permission Map (for RBAC) ---
exports.PERMISSIONS = {
    USER_CREATE: 'user.create',
    USER_READ: 'user.read',
    USER_UPDATE: 'user.update',
    USER_DELETE: 'user.delete',
    EMPLOYEE_CREATE: 'employee.create',
    EMPLOYEE_READ: 'employee.read',
    EMPLOYEE_UPDATE: 'employee.update',
    EMPLOYEE_DELETE: 'employee.delete',
    SITE_CREATE: 'site.create',
    SITE_READ: 'site.read',
    SITE_UPDATE: 'site.update',
    GUARD_REGISTER: 'guard.register',
    GUARD_ASSIGN_SITE: 'guard.assign-site',
    GUARD_MODIFY_HOURS: 'guard.modify-hours',
    ATTENDANCE_READ: 'attendance.read',
    ATTENDANCE_CLOCK: 'attendance.clock',
    ATTENDANCE_MANAGE: 'attendance.manage',
    ATTENDANCE_FILE: 'attendance.file',
    STAFF_ATTENDANCE_MANAGE: 'staff-attendance.manage',
    GUARD_PAYROLL_READ: 'guard-payroll.read',
    GUARD_PAYROLL_RATES: 'guard-payroll.rates',
    GUARD_PAYROLL_CALCULATE: 'guard-payroll.calculate',
    GUARD_PAYROLL_CHECK: 'guard-payroll.check',
    GUARD_PAYROLL_APPROVE: 'guard-payroll.approve',
    GUARD_PAYROLL_PAY: 'guard-payroll.pay',
    GUARD_PAYROLL_RETURN: 'guard-payroll.return',
    OFFICE_PAYROLL_CREATE: 'office-payroll.create',
    OFFICE_PAYROLL_CALCULATE: 'office-payroll.calculate',
    OFFICE_PAYROLL_SUBMIT: 'office-payroll.submit',
    OFFICE_PAYROLL_CHECK: 'office-payroll.check',
    OFFICE_PAYROLL_ENTER_OT: 'office-payroll.enter-ot',
    OFFICE_PAYROLL_RETURN: 'office-payroll.return',
    OFFICE_PAYROLL_RATES: 'office-payroll.rates',
    OFFICE_PAYROLL_APPROVE: 'office-payroll.approve',
    OFFICE_PAYROLL_PAY: 'office-payroll.pay',
    REPORT_READ: 'report.read',
    AUDIT_READ: 'audit.read',
    SETTINGS_READ: 'settings.read',
    SETTINGS_UPDATE: 'settings.update',
    PAYROLL_PERIOD_READ: 'payroll-period.read',
    PAYROLL_CONFIG_MANAGE: 'payroll-config.manage',
    CANDIDATE_READ: 'candidate.read',
    CANDIDATE_MANAGE: 'candidate.manage',
    PERFORMANCE_READ: 'performance.read',
    PERFORMANCE_MANAGE: 'performance.manage',
    ROTATION_READ: 'rotation.read',
    ROTATION_MANAGE: 'rotation.manage',
    ROTATION_GENERATE: 'rotation.generate',
};
// --- Role -> Permission Mapping ---
// SUPER_ADMIN: can view everything, cannot modify
// HR_ADMIN: register employees (staff + guards), manage attendance, view everything
// FINANCE_OFFICER: full access, payroll inputs + calculations
// OPERATIONS: assign sites to guards, modify guard hours (fraud correction)
// GUARD: clock in/out, view own hours
exports.ROLE_PERMISSIONS = {
    [UserRole.SUPER_ADMIN]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.USER_CREATE,
        exports.PERMISSIONS.USER_UPDATE,
        exports.PERMISSIONS.EMPLOYEE_CREATE,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.EMPLOYEE_UPDATE,
        exports.PERMISSIONS.EMPLOYEE_DELETE,
        exports.PERMISSIONS.SITE_CREATE,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.SITE_UPDATE,
        exports.PERMISSIONS.GUARD_REGISTER,
        exports.PERMISSIONS.GUARD_ASSIGN_SITE,
        exports.PERMISSIONS.GUARD_MODIFY_HOURS,
        exports.PERMISSIONS.ATTENDANCE_READ,
        exports.PERMISSIONS.ATTENDANCE_CLOCK,
        exports.PERMISSIONS.ATTENDANCE_MANAGE,
        exports.PERMISSIONS.ATTENDANCE_FILE,
        exports.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_RATES,
        exports.PERMISSIONS.GUARD_PAYROLL_CALCULATE,
        exports.PERMISSIONS.GUARD_PAYROLL_CHECK,
        exports.PERMISSIONS.GUARD_PAYROLL_APPROVE,
        exports.PERMISSIONS.GUARD_PAYROLL_PAY,
        exports.PERMISSIONS.GUARD_PAYROLL_RETURN,
        exports.PERMISSIONS.OFFICE_PAYROLL_CREATE,
        exports.PERMISSIONS.OFFICE_PAYROLL_CALCULATE,
        exports.PERMISSIONS.OFFICE_PAYROLL_SUBMIT,
        exports.PERMISSIONS.OFFICE_PAYROLL_CHECK,
        exports.PERMISSIONS.OFFICE_PAYROLL_ENTER_OT,
        exports.PERMISSIONS.OFFICE_PAYROLL_RETURN,
        exports.PERMISSIONS.OFFICE_PAYROLL_RATES,
        exports.PERMISSIONS.OFFICE_PAYROLL_APPROVE,
        exports.PERMISSIONS.OFFICE_PAYROLL_PAY,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.SETTINGS_UPDATE,
        exports.PERMISSIONS.PAYROLL_PERIOD_READ,
        exports.PERMISSIONS.PAYROLL_CONFIG_MANAGE,
        exports.PERMISSIONS.CANDIDATE_READ,
        exports.PERMISSIONS.CANDIDATE_MANAGE,
        exports.PERMISSIONS.PERFORMANCE_READ,
        exports.PERMISSIONS.PERFORMANCE_MANAGE,
        exports.PERMISSIONS.ROTATION_READ,
        exports.PERMISSIONS.ROTATION_MANAGE,
        exports.PERMISSIONS.ROTATION_GENERATE,
    ],
    [UserRole.SYSTEM_ADMIN]: [
        exports.PERMISSIONS.USER_CREATE,
        exports.PERMISSIONS.USER_UPDATE,
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.EMPLOYEE_CREATE,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.EMPLOYEE_UPDATE,
        exports.PERMISSIONS.EMPLOYEE_DELETE,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.SETTINGS_UPDATE,
        exports.PERMISSIONS.AUDIT_READ,
    ],
    [UserRole.HR_ADMIN]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.EMPLOYEE_CREATE,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.EMPLOYEE_UPDATE,
        exports.PERMISSIONS.EMPLOYEE_DELETE,
        exports.PERMISSIONS.SITE_CREATE,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.SITE_UPDATE,
        exports.PERMISSIONS.GUARD_REGISTER,
        exports.PERMISSIONS.GUARD_ASSIGN_SITE,
        exports.PERMISSIONS.ATTENDANCE_CLOCK,
        exports.PERMISSIONS.ATTENDANCE_READ,
        exports.PERMISSIONS.ATTENDANCE_MANAGE,
        exports.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.OFFICE_PAYROLL_CREATE,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.CANDIDATE_READ,
        exports.PERMISSIONS.CANDIDATE_MANAGE,
        exports.PERMISSIONS.PERFORMANCE_READ,
        exports.PERMISSIONS.PERFORMANCE_MANAGE,
    ],
    [UserRole.FINANCE_OFFICER]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.ATTENDANCE_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_RATES,
        exports.PERMISSIONS.GUARD_PAYROLL_CALCULATE,
        exports.PERMISSIONS.GUARD_PAYROLL_CHECK,
        exports.PERMISSIONS.GUARD_PAYROLL_PAY,
        exports.PERMISSIONS.GUARD_PAYROLL_RETURN,
        exports.PERMISSIONS.OFFICE_PAYROLL_CREATE,
        exports.PERMISSIONS.OFFICE_PAYROLL_CALCULATE,
        exports.PERMISSIONS.OFFICE_PAYROLL_SUBMIT,
        exports.PERMISSIONS.OFFICE_PAYROLL_CHECK,
        exports.PERMISSIONS.OFFICE_PAYROLL_ENTER_OT,
        exports.PERMISSIONS.OFFICE_PAYROLL_RETURN,
        exports.PERMISSIONS.OFFICE_PAYROLL_RATES,
        exports.PERMISSIONS.OFFICE_PAYROLL_PAY,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.SETTINGS_UPDATE,
        exports.PERMISSIONS.PAYROLL_PERIOD_READ,
    ],
    [UserRole.OPERATIONS]: [
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_CREATE,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.SITE_UPDATE,
        exports.PERMISSIONS.GUARD_ASSIGN_SITE,
        exports.PERMISSIONS.GUARD_MODIFY_HOURS,
        exports.PERMISSIONS.ATTENDANCE_READ,
        exports.PERMISSIONS.ATTENDANCE_FILE,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.PAYROLL_PERIOD_READ,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.CANDIDATE_READ,
        exports.PERMISSIONS.ROTATION_READ,
        exports.PERMISSIONS.ROTATION_MANAGE,
        exports.PERMISSIONS.ROTATION_GENERATE,
    ],
    [UserRole.GUARD]: [
        exports.PERMISSIONS.ATTENDANCE_CLOCK,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
    ],
    [UserRole.HEAD]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.ATTENDANCE_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_APPROVE,
        exports.PERMISSIONS.GUARD_PAYROLL_RETURN,
        exports.PERMISSIONS.OFFICE_PAYROLL_APPROVE,
        exports.PERMISSIONS.OFFICE_PAYROLL_RETURN,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.SETTINGS_READ,
    ],
    [UserRole.CEO]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.ATTENDANCE_READ,
        exports.PERMISSIONS.ATTENDANCE_MANAGE,
        exports.PERMISSIONS.ATTENDANCE_FILE,
        exports.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.PAYROLL_PERIOD_READ,
        exports.PERMISSIONS.CANDIDATE_READ,
        exports.PERMISSIONS.PERFORMANCE_READ,
        exports.PERMISSIONS.ROTATION_READ,
    ],
};
//# sourceMappingURL=index.js.map