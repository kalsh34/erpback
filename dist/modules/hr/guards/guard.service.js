"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Employee_1 = require("../../../models/Employee");
const GuardProfile_1 = require("../../../models/GuardProfile");
const PrimarySiteAssignment_1 = require("../../../models/PrimarySiteAssignment");
const User_1 = require("../../../models/User");
const Site_1 = require("../../../models/Site");
const Organization_1 = require("../../../core/organizations/Organization");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
let _supportsTransactions = null;
async function supportsTransactions() {
    if (_supportsTransactions !== null)
        return _supportsTransactions;
    try {
        const admin = mongoose_1.default.connection.db.admin();
        const status = await admin.command({ replSetGetStatus: 1 });
        _supportsTransactions = !!status.set;
    }
    catch {
        _supportsTransactions = false;
    }
    return _supportsTransactions;
}
class GuardService {
    static async registerGuard(data, auditCtx) {
        const useTxn = await supportsTransactions();
        let session = null;
        if (useTxn) {
            session = await mongoose_1.default.startSession();
            session.startTransaction();
        }
        const createdDocs = [];
        try {
            const existingEmployee = await Employee_1.Employee.findOne({ email: data.email }, undefined, session ? { session } : undefined);
            if (existingEmployee)
                throw ApiError_1.ApiError.conflict('Email already used by an employee');
            const prefix = 'VSP';
            const org = await Organization_1.Organization.findOneAndUpdate({ employeeCodePrefix: prefix }, { $inc: { nextEmployeeCode: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
            const nextCode = `${prefix}-${org.nextEmployeeCode}`;
            const [employee] = await Employee_1.Employee.create([{
                    employeeCode: nextCode, firstName: data.firstName, lastName: data.lastName,
                    phone: data.phone, email: data.email, category: types_1.EmployeeCategory.GUARD,
                    hireDate: new Date(), homeSiteId: data.homeSiteId || undefined,
                    guardInfo: { employmentType: data.employmentType, idCardNumber: data.idCardNumber },
                }], session ? { session } : undefined);
            createdDocs.push({ model: Employee_1.Employee, doc: employee });
            const [profile] = await GuardProfile_1.GuardProfile.create([{
                    employeeId: employee._id, position: types_1.GuardPosition.GUARD,
                    employmentType: data.employmentType, idCardNumber: data.idCardNumber,
                    rate: data.rate || 0, transportAllowance: data.transportAllowance || 0,
                }], session ? { session } : undefined);
            createdDocs.push({ model: GuardProfile_1.GuardProfile, doc: profile });
            const hash = await bcryptjs_1.default.hash(data.password, 12);
            const [user] = await User_1.User.create([{
                    email: data.email, password: hash, firstName: data.firstName,
                    lastName: data.lastName, role: types_1.UserRole.GUARD, employeeId: employee._id,
                }], session ? { session } : undefined);
            createdDocs.push({ model: User_1.User, doc: user });
            if (session) {
                await session.commitTransaction();
                session.endSession();
            }
            if (auditCtx) {
                AuditService_1.AuditService.log({ userId: auditCtx.userId, action: 'GUARD_REGISTER', entity: 'Employee', entityId: employee._id.toString(), newValues: { employeeCode: nextCode, firstName: data.firstName, lastName: data.lastName, email: data.email }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
            }
            EventBus_1.eventBus.emit('hr.guard.registered', { employeeId: employee._id, employeeCode: nextCode });
            return { employee, user: { email: user.email, role: user.role } };
        }
        catch (err) {
            if (session) {
                try {
                    await session.abortTransaction();
                }
                catch { }
                session.endSession();
            }
            for (const { model, doc } of createdDocs) {
                await model.deleteOne({ _id: doc._id }).catch(() => { });
            }
            throw err;
        }
    }
    static async assignSite(data, auditCtx) {
        const employee = await Employee_1.Employee.findById(data.guardId);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Guard not found');
        if (employee.category !== types_1.EmployeeCategory.GUARD)
            throw ApiError_1.ApiError.badRequest('Employee is not a guard');
        const site = await Site_1.Site.findById(data.siteId);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        const existing = await PrimarySiteAssignment_1.PrimarySiteAssignment.findOne({ guardId: data.guardId, siteId: data.siteId, isCurrent: true });
        if (existing)
            throw ApiError_1.ApiError.conflict('Guard is already assigned to this site');
        const profile = await GuardProfile_1.GuardProfile.findOne({ employeeId: data.guardId });
        const assignment = await PrimarySiteAssignment_1.PrimarySiteAssignment.create({
            guardId: data.guardId, siteId: data.siteId, role: data.role || 'GUARD',
            standardMonthlyHours: 208, hourlyRate: profile?.rate || 0,
            transportAllowance: profile?.transportAllowance || 0, effectiveFrom: new Date(), isCurrent: true,
        });
        if (auditCtx) {
            AuditService_1.AuditService.log({ userId: auditCtx.userId, action: 'GUARD_ASSIGN_SITE', entity: 'PrimarySiteAssignment', entityId: assignment._id.toString(), newValues: { guardId: data.guardId, siteId: data.siteId, role: data.role || 'GUARD' }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
        }
        EventBus_1.eventBus.emit('hr.guard.siteAssigned', { guardId: data.guardId, siteId: data.siteId, assignmentId: assignment._id, role: data.role || 'GUARD' });
        return assignment;
    }
    static async getGuardSites(guardId) {
        return PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId }).populate('siteId').sort({ effectiveFrom: -1 });
    }
    static async removeSiteAssignment(assignmentId, auditCtx) {
        const assignment = await PrimarySiteAssignment_1.PrimarySiteAssignment.findById(assignmentId);
        if (!assignment)
            throw ApiError_1.ApiError.notFound('Assignment not found');
        assignment.isCurrent = false;
        assignment.effectiveTo = new Date();
        await assignment.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({ userId: auditCtx.userId, action: 'GUARD_REMOVE_SITE', entity: 'PrimarySiteAssignment', entityId: assignmentId, oldValues: { guardId: assignment.guardId.toString(), siteId: assignment.siteId.toString(), isCurrent: true }, newValues: { isCurrent: false }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
        }
        EventBus_1.eventBus.emit('hr.guard.siteRemoved', { guardId: assignment.guardId, siteId: assignment.siteId, assignmentId });
        return assignment;
    }
    static async getAllGuards() {
        const employees = await Employee_1.Employee.find({ category: types_1.EmployeeCategory.GUARD }).sort({ employeeCode: 1 });
        return Promise.all(employees.map(async (emp) => {
            const profile = await GuardProfile_1.GuardProfile.findOne({ employeeId: emp._id });
            const currentAssignments = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: emp._id, isCurrent: true }).populate('siteId');
            return { employee: emp, profile, currentAssignments };
        }));
    }
    static async getGuardDetail(employeeId) {
        const employee = await Employee_1.Employee.findById(employeeId);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Guard not found');
        const profile = await GuardProfile_1.GuardProfile.findOne({ employeeId });
        const assignments = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: employeeId }).populate('siteId').sort({ effectiveFrom: -1 });
        const user = await User_1.User.findOne({ employeeId });
        return { employee, profile, assignments, user: user ? { email: user.email, role: user.role, isActive: user.isActive } : null };
    }
    static async updateGuard(employeeId, data, auditCtx) {
        const old = await Employee_1.Employee.findById(employeeId);
        if (!old)
            throw ApiError_1.ApiError.notFound('Guard not found');
        const oldValues = old.toObject();
        const employee = await Employee_1.Employee.findByIdAndUpdate(employeeId, data, { new: true, runValidators: true });
        if (!employee)
            throw ApiError_1.ApiError.notFound('Guard not found');
        if (auditCtx) {
            AuditService_1.AuditService.log({ userId: auditCtx.userId, action: 'GUARD_UPDATE', entity: 'Employee', entityId: employeeId, oldValues: { firstName: oldValues.firstName, lastName: oldValues.lastName, phone: oldValues.phone }, newValues: data, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
        }
        EventBus_1.eventBus.emit('hr.guard.updated', { employeeId });
        return employee;
    }
    static async updateGuardPayRate(assignmentId, hourlyRate, auditCtx) {
        const assignment = await PrimarySiteAssignment_1.PrimarySiteAssignment.findById(assignmentId);
        if (!assignment)
            throw ApiError_1.ApiError.notFound('Assignment not found');
        const oldRate = assignment.hourlyRate;
        assignment.hourlyRate = hourlyRate;
        await assignment.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({ userId: auditCtx.userId, action: 'GUARD_PAY_RATE_UPDATE', entity: 'PrimarySiteAssignment', entityId: assignmentId, oldValues: { hourlyRate: oldRate }, newValues: { hourlyRate }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
        }
        EventBus_1.eventBus.emit('hr.guard.payRateUpdated', { assignmentId, hourlyRate });
        return assignment;
    }
    static async setHomeSite(employeeId, homeSiteId, auditCtx) {
        const employee = await Employee_1.Employee.findById(employeeId);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Guard not found');
        if (homeSiteId) {
            const site = await Site_1.Site.findById(homeSiteId);
            if (!site)
                throw ApiError_1.ApiError.notFound('Site not found');
        }
        const oldHomeSiteId = employee.homeSiteId;
        employee.homeSiteId = homeSiteId;
        await employee.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({ userId: auditCtx.userId, action: 'GUARD_HOME_SITE_UPDATE', entity: 'Employee', entityId: employeeId, oldValues: { homeSiteId: oldHomeSiteId?.toString() || null }, newValues: { homeSiteId }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
        }
        return employee;
    }
}
exports.GuardService = GuardService;
//# sourceMappingURL=guard.service.js.map