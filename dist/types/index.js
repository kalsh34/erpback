"use strict";
// ============================================================
// Vital Security PLC — Payroll System — Shared Types
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_MANDATORY_DENIES = exports.ROLE_PERMISSIONS = exports.MODULE_ACCESS_KEYS = exports.MODULE_ACCESS = exports.PERMISSIONS = exports.ProductType = exports.ContactType = exports.BillStatus = exports.GRNStatus = exports.POStatus = exports.RFQStatus = exports.PensionTaxBase = exports.DeductionStatus = exports.EmployeeDeductionType = exports.PaymentMethod = exports.StaffAttendanceStatus = exports.RotationGuardStatus = exports.RotationLifecycle = exports.RotationStatus = exports.ShiftAssignmentSource = exports.GuardAttendanceStatus = exports.AttendanceSource = exports.PayrollRecordStatus = exports.CompanyStatus = exports.SiteStatus = exports.SiteType = exports.EmploymentType = exports.GuardPosition = exports.Gender = exports.EmployeeStatus = exports.EmployeeCategory = exports.UserRole = void 0;
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
var CompanyStatus;
(function (CompanyStatus) {
    CompanyStatus["ACTIVE"] = "ACTIVE";
    CompanyStatus["INACTIVE"] = "INACTIVE";
})(CompanyStatus || (exports.CompanyStatus = CompanyStatus = {}));
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
var AttendanceSource;
(function (AttendanceSource) {
    AttendanceSource["SYSTEM"] = "SYSTEM";
    AttendanceSource["SELF_CLOCK"] = "SELF_CLOCK";
    AttendanceSource["OPERATIONS_EDIT"] = "OPERATIONS_EDIT";
    AttendanceSource["HR_MANUAL"] = "HR_MANUAL";
    AttendanceSource["MANUAL_ENTRY"] = "MANUAL_ENTRY";
    AttendanceSource["ROTATION"] = "ROTATION";
})(AttendanceSource || (exports.AttendanceSource = AttendanceSource = {}));
/** Lifecycle of a guard attendance row: VOID is a controlled correction, never a hard delete. */
var GuardAttendanceStatus;
(function (GuardAttendanceStatus) {
    GuardAttendanceStatus["ACTIVE"] = "ACTIVE";
    GuardAttendanceStatus["VOID"] = "VOID";
})(GuardAttendanceStatus || (exports.GuardAttendanceStatus = GuardAttendanceStatus = {}));
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
// --- Guard Rotation & Scheduling lifecycle (constraint engine) ---
var RotationLifecycle;
(function (RotationLifecycle) {
    RotationLifecycle["DRAFT"] = "DRAFT";
    RotationLifecycle["GENERATING"] = "GENERATING";
    RotationLifecycle["GENERATED"] = "GENERATED";
    RotationLifecycle["REVIEW"] = "REVIEW";
    RotationLifecycle["APPROVED"] = "APPROVED";
    RotationLifecycle["PUBLISHED"] = "PUBLISHED";
    RotationLifecycle["ACTIVE"] = "ACTIVE";
    RotationLifecycle["COMPLETED"] = "COMPLETED";
    RotationLifecycle["CANCELLED"] = "CANCELLED";
    RotationLifecycle["ARCHIVED"] = "ARCHIVED";
})(RotationLifecycle || (exports.RotationLifecycle = RotationLifecycle = {}));
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
var EmployeeDeductionType;
(function (EmployeeDeductionType) {
    EmployeeDeductionType["LOAN"] = "LOAN";
    EmployeeDeductionType["ADVANCE"] = "ADVANCE";
    EmployeeDeductionType["PENALTY"] = "PENALTY";
    EmployeeDeductionType["OTHER"] = "OTHER";
})(EmployeeDeductionType || (exports.EmployeeDeductionType = EmployeeDeductionType = {}));
var DeductionStatus;
(function (DeductionStatus) {
    DeductionStatus["ACTIVE"] = "ACTIVE";
    DeductionStatus["COMPLETED"] = "COMPLETED";
    DeductionStatus["CANCELLED"] = "CANCELLED";
})(DeductionStatus || (exports.DeductionStatus = DeductionStatus = {}));
var PensionTaxBase;
(function (PensionTaxBase) {
    PensionTaxBase["NORMAL_SALARY_ONLY"] = "NORMAL_SALARY_ONLY";
    PensionTaxBase["GROSS_PAY"] = "GROSS_PAY";
})(PensionTaxBase || (exports.PensionTaxBase = PensionTaxBase = {}));
// --- Procurement & Purchasing Enums ---
var RFQStatus;
(function (RFQStatus) {
    RFQStatus["DRAFT"] = "DRAFT";
    RFQStatus["SUBMITTED"] = "SUBMITTED";
    RFQStatus["SENT_TO_VENDOR"] = "SENT_TO_VENDOR";
    RFQStatus["QUOTATION_RECEIVED"] = "QUOTATION_RECEIVED";
    RFQStatus["UNDER_EVALUATION"] = "UNDER_EVALUATION";
    RFQStatus["APPROVED"] = "APPROVED";
    RFQStatus["REJECTED"] = "REJECTED";
    RFQStatus["CANCELLED"] = "CANCELLED";
    RFQStatus["PO_CREATED"] = "PO_CREATED";
})(RFQStatus || (exports.RFQStatus = RFQStatus = {}));
var POStatus;
(function (POStatus) {
    POStatus["DRAFT"] = "DRAFT";
    POStatus["SUBMITTED"] = "SUBMITTED";
    POStatus["APPROVED"] = "APPROVED";
    POStatus["SENT_TO_VENDOR"] = "SENT_TO_VENDOR";
    POStatus["PARTIALLY_RECEIVED"] = "PARTIALLY_RECEIVED";
    POStatus["FULLY_RECEIVED"] = "FULLY_RECEIVED";
    POStatus["CLOSED"] = "CLOSED";
    POStatus["CANCELLED"] = "CANCELLED";
    POStatus["REJECTED"] = "REJECTED";
})(POStatus || (exports.POStatus = POStatus = {}));
var GRNStatus;
(function (GRNStatus) {
    GRNStatus["DRAFT"] = "DRAFT";
    GRNStatus["CONFIRMED"] = "CONFIRMED";
    GRNStatus["CANCELLED"] = "CANCELLED";
})(GRNStatus || (exports.GRNStatus = GRNStatus = {}));
var BillStatus;
(function (BillStatus) {
    BillStatus["DRAFT"] = "DRAFT";
    BillStatus["POSTED"] = "POSTED";
    BillStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    BillStatus["PAID"] = "PAID";
    BillStatus["CANCELLED"] = "CANCELLED";
})(BillStatus || (exports.BillStatus = BillStatus = {}));
var ContactType;
(function (ContactType) {
    ContactType["COMPANY"] = "COMPANY";
    ContactType["INDIVIDUAL"] = "INDIVIDUAL";
})(ContactType || (exports.ContactType = ContactType = {}));
var ProductType;
(function (ProductType) {
    ProductType["STOCKABLE"] = "STOCKABLE";
    ProductType["CONSUMABLE"] = "CONSUMABLE";
    ProductType["SERVICE"] = "SERVICE";
})(ProductType || (exports.ProductType = ProductType = {}));
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
    COMPANY_CREATE: 'company.create',
    COMPANY_READ: 'company.read',
    COMPANY_UPDATE: 'company.update',
    GUARD_REGISTER: 'guard.register',
    GUARD_ASSIGN_SITE: 'guard.assign-site',
    GUARD_MODIFY_HOURS: 'guard.modify-hours',
    GUARD_ATTENDANCE_READ: 'guard-attendance.read',
    GUARD_ATTENDANCE_MANAGE: 'guard-attendance.manage',
    GUARD_ATTENDANCE_FUTURE: 'guard-attendance.future',
    GUARD_ATTENDANCE_SELF: 'guard-attendance.self',
    STAFF_ATTENDANCE_MANAGE: 'staff-attendance.manage',
    GUARD_PAYROLL_READ: 'guard-payroll.read',
    GUARD_PAYROLL_RATES: 'guard-payroll.rates',
    GUARD_PAYROLL_CALCULATE: 'guard-payroll.calculate',
    GUARD_PAYROLL_CHECK: 'guard-payroll.check',
    GUARD_PAYROLL_APPROVE: 'guard-payroll.approve',
    GUARD_PAYROLL_PAY: 'guard-payroll.pay',
    GUARD_PAYROLL_RETURN: 'guard-payroll.return',
    OFFICE_PAYROLL_READ: 'office-payroll.read',
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
    ORGANIZATION_READ: 'organization.read',
    ORGANIZATION_MANAGE: 'organization.manage',
    CANDIDATE_READ: 'candidate.read',
    CANDIDATE_MANAGE: 'candidate.manage',
    PERFORMANCE_READ: 'performance.read',
    PERFORMANCE_MANAGE: 'performance.manage',
    ROTATION_READ: 'rotation.read',
    ROTATION_MANAGE: 'rotation.manage',
    ROTATION_GENERATE: 'rotation.generate',
    ROTATION_APPROVE: 'rotation.approve',
    ROTATION_PUBLISH: 'rotation.publish',
    ROTATION_OVERRIDE: 'rotation.override',
    CONTRACT_READ: 'contract.read',
    CONTRACT_CREATE: 'contract.create',
    CONTRACT_UPDATE: 'contract.update',
    GUARANTOR_READ: 'guarantor.read',
    GUARANTOR_MANAGE: 'guarantor.manage',
    FLEET_READ: 'fleet.read',
    FLEET_MANAGE: 'fleet.manage',
    FLEET_ASSIGN: 'fleet.assign',
    FLEET_REPORT: 'fleet.report',
    // Procurement & Purchasing module
    PURCHASE_READ: 'purchase.read',
    PURCHASE_CREATE: 'purchase.create',
    PURCHASE_UPDATE: 'purchase.update',
    PURCHASE_DELETE: 'purchase.delete',
    PURCHASE_APPROVE: 'purchase.approve',
    BILL_MANAGE: 'bill.manage',
    CONTACT_READ: 'contact.read',
    CONTACT_MANAGE: 'contact.manage',
    PRODUCT_READ: 'product.read',
    PRODUCT_MANAGE: 'product.manage',
    GRN_MANAGE: 'grn.manage',
};
/**
 * MODULE ACCESS REGISTRY — the modules an admin can grant or deny per user.
 * Each module groups the permissions that belong to it; effective user
 * permissions = role defaults + granted modules − denied modules.
 */
exports.MODULE_ACCESS = [
    {
        key: 'procurement',
        label: 'Procurement & Purchasing',
        permissions: [
            exports.PERMISSIONS.PURCHASE_READ,
            exports.PERMISSIONS.PURCHASE_CREATE,
            exports.PERMISSIONS.PURCHASE_UPDATE,
            exports.PERMISSIONS.PURCHASE_APPROVE,
            exports.PERMISSIONS.PURCHASE_DELETE,
            exports.PERMISSIONS.CONTACT_READ,
            exports.PERMISSIONS.CONTACT_MANAGE,
            exports.PERMISSIONS.PRODUCT_READ,
            exports.PERMISSIONS.PRODUCT_MANAGE,
            exports.PERMISSIONS.GRN_MANAGE,
            exports.PERMISSIONS.BILL_MANAGE,
        ],
    },
    {
        key: 'hr',
        label: 'HR & People',
        permissions: [
            exports.PERMISSIONS.EMPLOYEE_READ,
            exports.PERMISSIONS.EMPLOYEE_CREATE,
            exports.PERMISSIONS.EMPLOYEE_UPDATE,
            exports.PERMISSIONS.EMPLOYEE_DELETE,
            exports.PERMISSIONS.GUARANTOR_READ,
            exports.PERMISSIONS.GUARANTOR_MANAGE,
            exports.PERMISSIONS.CONTRACT_READ,
            exports.PERMISSIONS.CONTRACT_CREATE,
            exports.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
            exports.PERMISSIONS.GUARD_REGISTER,
        ],
    },
    {
        key: 'company',
        label: 'Companies & Sites',
        permissions: [exports.PERMISSIONS.COMPANY_READ, exports.PERMISSIONS.COMPANY_CREATE, exports.PERMISSIONS.COMPANY_UPDATE, exports.PERMISSIONS.SITE_READ, exports.PERMISSIONS.SITE_CREATE, exports.PERMISSIONS.SITE_UPDATE],
    },
    {
        key: 'operations',
        label: 'Operations & Attendance',
        permissions: [
            exports.PERMISSIONS.GUARD_ASSIGN_SITE,
            exports.PERMISSIONS.GUARD_MODIFY_HOURS,
            exports.PERMISSIONS.GUARD_ATTENDANCE_READ,
            exports.PERMISSIONS.GUARD_ATTENDANCE_MANAGE,
            exports.PERMISSIONS.GUARD_ATTENDANCE_FUTURE,
            exports.PERMISSIONS.GUARD_ATTENDANCE_SELF,
            exports.PERMISSIONS.ROTATION_READ,
            exports.PERMISSIONS.ROTATION_MANAGE,
            exports.PERMISSIONS.ROTATION_GENERATE,
            exports.PERMISSIONS.ROTATION_APPROVE,
            exports.PERMISSIONS.ROTATION_PUBLISH,
            exports.PERMISSIONS.ROTATION_OVERRIDE,
        ],
    },
    {
        key: 'payroll',
        label: 'Payroll',
        permissions: [
            exports.PERMISSIONS.GUARD_PAYROLL_READ,
            exports.PERMISSIONS.GUARD_PAYROLL_RATES,
            exports.PERMISSIONS.GUARD_PAYROLL_CALCULATE,
            exports.PERMISSIONS.GUARD_PAYROLL_CHECK,
            exports.PERMISSIONS.GUARD_PAYROLL_APPROVE,
            exports.PERMISSIONS.GUARD_PAYROLL_PAY,
            exports.PERMISSIONS.GUARD_PAYROLL_RETURN,
            exports.PERMISSIONS.OFFICE_PAYROLL_READ,
            exports.PERMISSIONS.OFFICE_PAYROLL_CREATE,
            exports.PERMISSIONS.OFFICE_PAYROLL_CALCULATE,
            exports.PERMISSIONS.OFFICE_PAYROLL_SUBMIT,
            exports.PERMISSIONS.OFFICE_PAYROLL_CHECK,
            exports.PERMISSIONS.OFFICE_PAYROLL_ENTER_OT,
            exports.PERMISSIONS.OFFICE_PAYROLL_RETURN,
            exports.PERMISSIONS.OFFICE_PAYROLL_RATES,
            exports.PERMISSIONS.OFFICE_PAYROLL_APPROVE,
            exports.PERMISSIONS.OFFICE_PAYROLL_PAY,
            exports.PERMISSIONS.PAYROLL_PERIOD_READ,
            exports.PERMISSIONS.PAYROLL_CONFIG_MANAGE,
        ],
    },
    { key: 'reports', label: 'Reports', permissions: [exports.PERMISSIONS.REPORT_READ] },
    {
        key: 'administration',
        label: 'Administration',
        permissions: [
            exports.PERMISSIONS.USER_READ,
            exports.PERMISSIONS.USER_CREATE,
            exports.PERMISSIONS.USER_UPDATE,
            exports.PERMISSIONS.USER_DELETE,
            exports.PERMISSIONS.AUDIT_READ,
            exports.PERMISSIONS.SETTINGS_READ,
            exports.PERMISSIONS.SETTINGS_UPDATE,
            exports.PERMISSIONS.ORGANIZATION_READ,
            exports.PERMISSIONS.ORGANIZATION_MANAGE,
        ],
    },
    { key: 'recruitment', label: 'Recruitment', permissions: [exports.PERMISSIONS.CANDIDATE_READ, exports.PERMISSIONS.CANDIDATE_MANAGE] },
    { key: 'performance', label: 'Performance', permissions: [exports.PERMISSIONS.PERFORMANCE_READ, exports.PERMISSIONS.PERFORMANCE_MANAGE] },
    {
        key: 'fleet',
        label: 'Fleet Management',
        permissions: [
            exports.PERMISSIONS.FLEET_READ,
            exports.PERMISSIONS.FLEET_MANAGE,
            exports.PERMISSIONS.FLEET_ASSIGN,
            exports.PERMISSIONS.FLEET_REPORT,
        ],
    },
];
exports.MODULE_ACCESS_KEYS = exports.MODULE_ACCESS.map((m) => m.key);
// --- Role -> Permission Mapping ---
// SUPER_ADMIN: can view everything, cannot modify
// HR_ADMIN: register employees (staff + guards), manage staff attendance, view everything
// FINANCE_OFFICER: full access, payroll inputs + calculations
// OPERATIONS: assign sites to guards, manage rotations
// GUARD: view own site/payroll info
exports.ROLE_PERMISSIONS = {
    [UserRole.SUPER_ADMIN]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.USER_CREATE,
        exports.PERMISSIONS.USER_UPDATE,
        exports.PERMISSIONS.USER_DELETE,
        exports.PERMISSIONS.EMPLOYEE_CREATE,
        exports.PERMISSIONS.CONTRACT_CREATE,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.EMPLOYEE_UPDATE,
        exports.PERMISSIONS.EMPLOYEE_DELETE,
        exports.PERMISSIONS.SITE_CREATE,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.SITE_UPDATE,
        exports.PERMISSIONS.COMPANY_CREATE,
        exports.PERMISSIONS.COMPANY_READ,
        exports.PERMISSIONS.COMPANY_UPDATE,
        exports.PERMISSIONS.GUARD_REGISTER,
        exports.PERMISSIONS.GUARD_ASSIGN_SITE,
        exports.PERMISSIONS.GUARD_MODIFY_HOURS,
        exports.PERMISSIONS.GUARD_ATTENDANCE_READ,
        exports.PERMISSIONS.GUARD_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_ATTENDANCE_FUTURE,
        exports.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_RATES,
        exports.PERMISSIONS.GUARD_PAYROLL_CALCULATE,
        exports.PERMISSIONS.GUARD_PAYROLL_CHECK,
        exports.PERMISSIONS.GUARD_PAYROLL_APPROVE,
        exports.PERMISSIONS.GUARD_PAYROLL_PAY,
        exports.PERMISSIONS.GUARD_PAYROLL_RETURN,
        exports.PERMISSIONS.OFFICE_PAYROLL_READ,
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
        exports.PERMISSIONS.ORGANIZATION_READ,
        exports.PERMISSIONS.ORGANIZATION_MANAGE,
        exports.PERMISSIONS.CANDIDATE_READ,
        exports.PERMISSIONS.CANDIDATE_MANAGE,
        exports.PERMISSIONS.PERFORMANCE_READ,
        exports.PERMISSIONS.PERFORMANCE_MANAGE,
        exports.PERMISSIONS.ROTATION_READ,
        exports.PERMISSIONS.ROTATION_MANAGE,
        exports.PERMISSIONS.ROTATION_GENERATE,
        exports.PERMISSIONS.ROTATION_APPROVE,
        exports.PERMISSIONS.ROTATION_PUBLISH,
        exports.PERMISSIONS.CONTRACT_READ,
        exports.PERMISSIONS.CONTRACT_UPDATE,
        exports.PERMISSIONS.GUARANTOR_READ,
        exports.PERMISSIONS.GUARANTOR_MANAGE,
        exports.PERMISSIONS.ROTATION_OVERRIDE,
        exports.PERMISSIONS.PURCHASE_READ,
        exports.PERMISSIONS.PURCHASE_CREATE,
        exports.PERMISSIONS.PURCHASE_UPDATE,
        exports.PERMISSIONS.PURCHASE_APPROVE,
        exports.PERMISSIONS.PURCHASE_DELETE,
        exports.PERMISSIONS.CONTACT_READ,
        exports.PERMISSIONS.CONTACT_MANAGE,
        exports.PERMISSIONS.PRODUCT_READ,
        exports.PERMISSIONS.PRODUCT_MANAGE,
        exports.PERMISSIONS.GRN_MANAGE,
        exports.PERMISSIONS.BILL_MANAGE,
    ],
    [UserRole.SYSTEM_ADMIN]: [
        exports.PERMISSIONS.USER_CREATE,
        exports.PERMISSIONS.USER_UPDATE,
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.COMPANY_CREATE,
        exports.PERMISSIONS.COMPANY_READ,
        exports.PERMISSIONS.COMPANY_UPDATE,
        exports.PERMISSIONS.EMPLOYEE_CREATE,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.EMPLOYEE_UPDATE,
        exports.PERMISSIONS.EMPLOYEE_DELETE,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.SETTINGS_UPDATE,
        exports.PERMISSIONS.ORGANIZATION_READ,
        exports.PERMISSIONS.ORGANIZATION_MANAGE,
        exports.PERMISSIONS.GUARD_ATTENDANCE_READ,
        exports.PERMISSIONS.CONTRACT_READ,
        exports.PERMISSIONS.CONTRACT_CREATE,
        exports.PERMISSIONS.CONTRACT_UPDATE,
        exports.PERMISSIONS.GUARANTOR_READ,
        exports.PERMISSIONS.GUARANTOR_MANAGE,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.PURCHASE_READ,
        exports.PERMISSIONS.PURCHASE_CREATE,
        exports.PERMISSIONS.PURCHASE_UPDATE,
        exports.PERMISSIONS.PURCHASE_APPROVE,
        exports.PERMISSIONS.PURCHASE_DELETE,
        exports.PERMISSIONS.CONTACT_READ,
        exports.PERMISSIONS.CONTACT_MANAGE,
        exports.PERMISSIONS.PRODUCT_READ,
        exports.PERMISSIONS.PRODUCT_MANAGE,
        exports.PERMISSIONS.GRN_MANAGE,
        exports.PERMISSIONS.BILL_MANAGE,
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
        // COMPANY_CREATE / COMPANY_UPDATE intentionally NOT granted: companies are
        // administered by admins only (HR manages employees/sites, not companies).
        exports.PERMISSIONS.COMPANY_READ,
        exports.PERMISSIONS.GUARD_REGISTER,
        exports.PERMISSIONS.GUARD_ASSIGN_SITE,
        exports.PERMISSIONS.GUARD_ATTENDANCE_READ,
        exports.PERMISSIONS.GUARD_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_ATTENDANCE_FUTURE,
        exports.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.OFFICE_PAYROLL_READ,
        exports.PERMISSIONS.OFFICE_PAYROLL_CREATE,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.ORGANIZATION_READ,
        exports.PERMISSIONS.ORGANIZATION_MANAGE,
        exports.PERMISSIONS.CANDIDATE_READ,
        exports.PERMISSIONS.CANDIDATE_MANAGE,
        exports.PERMISSIONS.PERFORMANCE_READ,
        exports.PERMISSIONS.PERFORMANCE_MANAGE,
        exports.PERMISSIONS.ROTATION_READ,
        exports.PERMISSIONS.ROTATION_MANAGE,
        exports.PERMISSIONS.ROTATION_GENERATE,
        exports.PERMISSIONS.ROTATION_APPROVE,
        exports.PERMISSIONS.ROTATION_PUBLISH,
        exports.PERMISSIONS.CONTRACT_READ,
        exports.PERMISSIONS.CONTRACT_CREATE,
        exports.PERMISSIONS.CONTRACT_UPDATE,
        exports.PERMISSIONS.GUARANTOR_READ,
        exports.PERMISSIONS.GUARANTOR_MANAGE,
        exports.PERMISSIONS.ROTATION_OVERRIDE,
        exports.PERMISSIONS.PURCHASE_READ,
        exports.PERMISSIONS.CONTACT_READ,
        exports.PERMISSIONS.PRODUCT_READ,
    ],
    [UserRole.FINANCE_OFFICER]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_READ,
        // COMPANY_UPDATE intentionally NOT granted: Finance must not administer or
        // delete companies (company administration belongs to admins).
        exports.PERMISSIONS.COMPANY_READ,
        exports.PERMISSIONS.GUARD_ATTENDANCE_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_RATES,
        exports.PERMISSIONS.GUARD_PAYROLL_CALCULATE,
        exports.PERMISSIONS.GUARD_PAYROLL_CHECK,
        exports.PERMISSIONS.GUARD_PAYROLL_PAY,
        exports.PERMISSIONS.GUARD_PAYROLL_RETURN,
        exports.PERMISSIONS.OFFICE_PAYROLL_READ,
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
        exports.PERMISSIONS.CONTRACT_READ,
        exports.PERMISSIONS.CONTRACT_CREATE,
        exports.PERMISSIONS.CONTRACT_UPDATE,
        exports.PERMISSIONS.GUARANTOR_READ,
        exports.PERMISSIONS.GUARANTOR_MANAGE,
        exports.PERMISSIONS.PURCHASE_READ,
        exports.PERMISSIONS.PURCHASE_APPROVE,
        exports.PERMISSIONS.CONTACT_READ,
        exports.PERMISSIONS.PRODUCT_READ,
        exports.PERMISSIONS.BILL_MANAGE,
    ],
    [UserRole.OPERATIONS]: [
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.CONTRACT_READ,
        exports.PERMISSIONS.GUARANTOR_READ,
        exports.PERMISSIONS.SITE_CREATE,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.SITE_UPDATE,
        exports.PERMISSIONS.COMPANY_READ,
        exports.PERMISSIONS.GUARD_ASSIGN_SITE,
        exports.PERMISSIONS.GUARD_MODIFY_HOURS,
        exports.PERMISSIONS.GUARD_ATTENDANCE_READ,
        exports.PERMISSIONS.GUARD_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.OFFICE_PAYROLL_READ,
        exports.PERMISSIONS.PAYROLL_PERIOD_READ,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.CANDIDATE_READ,
        exports.PERMISSIONS.ROTATION_READ,
        exports.PERMISSIONS.ROTATION_MANAGE,
        exports.PERMISSIONS.ROTATION_GENERATE,
        exports.PERMISSIONS.ROTATION_OVERRIDE,
        exports.PERMISSIONS.PURCHASE_READ,
        exports.PERMISSIONS.PURCHASE_CREATE,
        exports.PERMISSIONS.PURCHASE_UPDATE,
        exports.PERMISSIONS.CONTACT_READ,
        exports.PERMISSIONS.PRODUCT_READ,
        exports.PERMISSIONS.GRN_MANAGE,
    ],
    [UserRole.GUARD]: [
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.GUARD_ATTENDANCE_SELF,
    ],
    [UserRole.HEAD]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.OFFICE_PAYROLL_READ,
        exports.PERMISSIONS.GUARD_PAYROLL_APPROVE,
        exports.PERMISSIONS.GUARD_PAYROLL_RETURN,
        exports.PERMISSIONS.OFFICE_PAYROLL_APPROVE,
        exports.PERMISSIONS.OFFICE_PAYROLL_RETURN,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.ROTATION_READ,
        exports.PERMISSIONS.CONTRACT_READ,
        exports.PERMISSIONS.CONTRACT_UPDATE,
        exports.PERMISSIONS.GUARANTOR_READ,
        exports.PERMISSIONS.GUARANTOR_MANAGE,
        exports.PERMISSIONS.ROTATION_APPROVE,
        exports.PERMISSIONS.PURCHASE_READ,
        exports.PERMISSIONS.PURCHASE_APPROVE,
        exports.PERMISSIONS.CONTACT_READ,
        exports.PERMISSIONS.PRODUCT_READ,
    ],
    [UserRole.CEO]: [
        exports.PERMISSIONS.USER_READ,
        exports.PERMISSIONS.EMPLOYEE_READ,
        exports.PERMISSIONS.SITE_READ,
        exports.PERMISSIONS.COMPANY_READ,
        exports.PERMISSIONS.GUARD_ATTENDANCE_READ,
        exports.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
        exports.PERMISSIONS.GUARD_PAYROLL_READ,
        exports.PERMISSIONS.OFFICE_PAYROLL_READ,
        exports.PERMISSIONS.REPORT_READ,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.SETTINGS_READ,
        exports.PERMISSIONS.PAYROLL_PERIOD_READ,
        exports.PERMISSIONS.CANDIDATE_READ,
        exports.PERMISSIONS.PERFORMANCE_READ,
        exports.PERMISSIONS.ROTATION_READ,
        exports.PERMISSIONS.CONTRACT_READ,
        exports.PERMISSIONS.GUARANTOR_READ,
        // ROTATION_APPROVE intentionally NOT granted: the CEO role is strictly
        // read-only (no business mutations of any kind, rotations included).
    ],
};
/**
 * Permissions that are MANDATORY exclusions for a role: the role map omits
 * them intentionally (see the COMPANY_* comments above) and per-user module
 * grants must never be able to restore them. computeEffectivePermissions
 * applies these as a final filter — whole-module grant bundles (e.g. the
 * `company` bundle, which legitimately hands COMPANY_CREATE/UPDATE to
 * Operations) cannot punch through role-level restrictions.
 */
exports.ROLE_MANDATORY_DENIES = {
    // HR manages employees/sites; companies are administered by admins only.
    [UserRole.HR_ADMIN]: [exports.PERMISSIONS.COMPANY_CREATE, exports.PERMISSIONS.COMPANY_UPDATE],
    // Finance must not administer or delete companies.
    [UserRole.FINANCE_OFFICER]: [exports.PERMISSIONS.COMPANY_CREATE, exports.PERMISSIONS.COMPANY_UPDATE],
};
//# sourceMappingURL=index.js.map