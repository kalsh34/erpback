export declare enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    SYSTEM_ADMIN = "SYSTEM_ADMIN",
    HR_ADMIN = "HR_ADMIN",
    FINANCE_OFFICER = "FINANCE_OFFICER",
    OPERATIONS = "OPERATIONS",
    GUARD = "GUARD",
    HEAD = "HEAD",
    CEO = "CEO"
}
export declare enum EmployeeCategory {
    GUARD = "GUARD",
    OFFICE_STAFF = "OFFICE_STAFF"
}
export declare enum EmployeeStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    TERMINATED = "TERMINATED",
    ON_LEAVE = "ON_LEAVE",
    CONTRACTED = "CONTRACTED"
}
export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE"
}
export declare enum GuardPosition {
    GUARD = "GUARD",
    SITE_LEADER = "SITE_LEADER"
}
export declare enum EmploymentType {
    PERMANENT = "PERMANENT",
    CONTRACT = "CONTRACT",
    TEMPORARY = "TEMPORARY"
}
export declare enum SiteType {
    COMMERCIAL = "COMMERCIAL",
    RESIDENTIAL = "RESIDENTIAL",
    INDUSTRIAL = "INDUSTRIAL",
    GOVERNMENT = "GOVERNMENT"
}
export declare enum SiteStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED"
}
export declare enum CompanyStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE"
}
export declare enum PayrollRecordStatus {
    DRAFT = "DRAFT",
    CALCULATED = "CALCULATED",
    SUBMITTED = "SUBMITTED",
    CHECKED = "CHECKED",
    APPROVED = "APPROVED",
    PAYMENT_PROCESSING = "PAYMENT_PROCESSING",
    PAID = "PAID",
    RETURNED = "RETURNED",
    CANCELLED = "CANCELLED"
}
export declare enum AttendanceSource {
    SYSTEM = "SYSTEM",
    SELF_CLOCK = "SELF_CLOCK",
    OPERATIONS_EDIT = "OPERATIONS_EDIT",
    HR_MANUAL = "HR_MANUAL",
    MANUAL_ENTRY = "MANUAL_ENTRY",
    ROTATION = "ROTATION"
}
/** Lifecycle of a guard attendance row: VOID is a controlled correction, never a hard delete. */
export declare enum GuardAttendanceStatus {
    ACTIVE = "ACTIVE",
    VOID = "VOID"
}
export declare enum ShiftAssignmentSource {
    MANUAL = "MANUAL",
    ROTATION = "ROTATION"
}
export declare enum RotationStatus {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    ARCHIVED = "ARCHIVED"
}
export declare enum RotationLifecycle {
    DRAFT = "DRAFT",
    GENERATING = "GENERATING",
    GENERATED = "GENERATED",
    REVIEW = "REVIEW",
    APPROVED = "APPROVED",
    PUBLISHED = "PUBLISHED",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    ARCHIVED = "ARCHIVED"
}
export declare enum RotationGuardStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    REMOVED = "REMOVED"
}
export declare enum StaffAttendanceStatus {
    PRESENT = "PRESENT",
    ABSENT = "ABSENT",
    PAID_LEAVE = "PAID_LEAVE",
    UNPAID_LEAVE = "UNPAID_LEAVE",
    SICK_LEAVE = "SICK_LEAVE",
    HALF_DAY = "HALF_DAY",
    HOLIDAY = "HOLIDAY",
    WEEKEND = "WEEKEND"
}
export declare enum PaymentMethod {
    BANK_TRANSFER = "BANK_TRANSFER",
    CASH = "CASH"
}
export declare enum EmployeeDeductionType {
    LOAN = "LOAN",
    ADVANCE = "ADVANCE",
    PENALTY = "PENALTY",
    OTHER = "OTHER"
}
export declare enum DeductionStatus {
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum PensionTaxBase {
    NORMAL_SALARY_ONLY = "NORMAL_SALARY_ONLY",
    GROSS_PAY = "GROSS_PAY"
}
export declare const PERMISSIONS: {
    readonly USER_CREATE: "user.create";
    readonly USER_READ: "user.read";
    readonly USER_UPDATE: "user.update";
    readonly USER_DELETE: "user.delete";
    readonly EMPLOYEE_CREATE: "employee.create";
    readonly EMPLOYEE_READ: "employee.read";
    readonly EMPLOYEE_UPDATE: "employee.update";
    readonly EMPLOYEE_DELETE: "employee.delete";
    readonly SITE_CREATE: "site.create";
    readonly SITE_READ: "site.read";
    readonly SITE_UPDATE: "site.update";
    readonly COMPANY_CREATE: "company.create";
    readonly COMPANY_READ: "company.read";
    readonly COMPANY_UPDATE: "company.update";
    readonly GUARD_REGISTER: "guard.register";
    readonly GUARD_ASSIGN_SITE: "guard.assign-site";
    readonly GUARD_MODIFY_HOURS: "guard.modify-hours";
    readonly GUARD_ATTENDANCE_READ: "guard-attendance.read";
    readonly GUARD_ATTENDANCE_MANAGE: "guard-attendance.manage";
    readonly GUARD_ATTENDANCE_FUTURE: "guard-attendance.future";
    readonly GUARD_ATTENDANCE_SELF: "guard-attendance.self";
    readonly STAFF_ATTENDANCE_MANAGE: "staff-attendance.manage";
    readonly GUARD_PAYROLL_READ: "guard-payroll.read";
    readonly GUARD_PAYROLL_RATES: "guard-payroll.rates";
    readonly GUARD_PAYROLL_CALCULATE: "guard-payroll.calculate";
    readonly GUARD_PAYROLL_CHECK: "guard-payroll.check";
    readonly GUARD_PAYROLL_APPROVE: "guard-payroll.approve";
    readonly GUARD_PAYROLL_PAY: "guard-payroll.pay";
    readonly GUARD_PAYROLL_RETURN: "guard-payroll.return";
    readonly OFFICE_PAYROLL_READ: "office-payroll.read";
    readonly OFFICE_PAYROLL_CREATE: "office-payroll.create";
    readonly OFFICE_PAYROLL_CALCULATE: "office-payroll.calculate";
    readonly OFFICE_PAYROLL_SUBMIT: "office-payroll.submit";
    readonly OFFICE_PAYROLL_CHECK: "office-payroll.check";
    readonly OFFICE_PAYROLL_ENTER_OT: "office-payroll.enter-ot";
    readonly OFFICE_PAYROLL_RETURN: "office-payroll.return";
    readonly OFFICE_PAYROLL_RATES: "office-payroll.rates";
    readonly OFFICE_PAYROLL_APPROVE: "office-payroll.approve";
    readonly OFFICE_PAYROLL_PAY: "office-payroll.pay";
    readonly REPORT_READ: "report.read";
    readonly AUDIT_READ: "audit.read";
    readonly SETTINGS_READ: "settings.read";
    readonly SETTINGS_UPDATE: "settings.update";
    readonly PAYROLL_PERIOD_READ: "payroll-period.read";
    readonly PAYROLL_CONFIG_MANAGE: "payroll-config.manage";
    readonly ORGANIZATION_READ: "organization.read";
    readonly ORGANIZATION_MANAGE: "organization.manage";
    readonly CANDIDATE_READ: "candidate.read";
    readonly CANDIDATE_MANAGE: "candidate.manage";
    readonly PERFORMANCE_READ: "performance.read";
    readonly PERFORMANCE_MANAGE: "performance.manage";
    readonly ROTATION_READ: "rotation.read";
    readonly ROTATION_MANAGE: "rotation.manage";
    readonly ROTATION_GENERATE: "rotation.generate";
    readonly ROTATION_APPROVE: "rotation.approve";
    readonly ROTATION_PUBLISH: "rotation.publish";
    readonly ROTATION_OVERRIDE: "rotation.override";
    readonly CONTRACT_READ: "contract.read";
    readonly CONTRACT_CREATE: "contract.create";
    readonly CONTRACT_UPDATE: "contract.update";
    readonly GUARANTOR_READ: "guarantor.read";
    readonly GUARANTOR_MANAGE: "guarantor.manage";
};
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
/**
 * MODULE ACCESS REGISTRY — the modules an admin can grant or deny per user.
 * Each module groups the permissions that belong to it; effective user
 * permissions = role defaults + granted modules − denied modules.
 */
export declare const MODULE_ACCESS: {
    key: string;
    label: string;
    permissions: Permission[];
}[];
export declare const MODULE_ACCESS_KEYS: string[];
export declare const ROLE_PERMISSIONS: Record<UserRole, Permission[]>;
export interface TaxBracketEntry {
    min: number;
    max: number | null;
    rate: number;
    deduction: number;
}
export interface GuardPayrollCalculation {
    normalSalary: number;
    workedSalary: number;
    otPay: number;
    holidayPay: number;
    secondaryShiftPay: number;
    grossPay: number;
    baseComponent: number;
    employeePension: number;
    employerPension: number;
    incomeTax: number;
    totalDeductions: number;
    netPay: number;
}
export interface StaffPayrollCalculation {
    grossSalary: number;
    taxableSalary: number;
    employeePension: number;
    employerPension: number;
    incomeTax: number;
    totalDeductions: number;
    netPay: number;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
//# sourceMappingURL=index.d.ts.map