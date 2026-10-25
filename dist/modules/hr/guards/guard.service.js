"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const payrollTransaction_1 = require("../../guardPayroll/payrollTransaction");
const assignmentTimeline_1 = require("../../guardPayroll/assignmentTimeline");
const GuardPayrollRun_1 = require("../../../models/GuardPayrollRun");
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
        return (0, payrollTransaction_1.payrollTransaction)(async () => {
            await Employee_1.Employee.updateOne({ _id: data.guardId }, { $inc: { __v: 1 } });
            return this.assignSiteTransactional(data, auditCtx);
        });
    }
    static async assignSiteTransactional(data, auditCtx) {
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
        // First site assignment automatically becomes the guard's Primary Site.
        const currentCount = await PrimarySiteAssignment_1.PrimarySiteAssignment.countDocuments({ guardId: data.guardId, isCurrent: true });
        const primaryRows = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: data.guardId, isPrimary: true });
        if ((0, assignmentTimeline_1.primaryOverlaps)(primaryRows).length)
            throw ApiError_1.ApiError.conflict('Primary assignment history overlaps. Use the audited assignment correction before adding sites.');
        const isPrimary = currentCount === 0;
        const from = data.effectiveFrom || (0, assignmentTimeline_1.assignmentDay)(new Date());
        const effectiveFrom = new Date(`${from}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !Number.isFinite(effectiveFrom.getTime()) || (0, assignmentTimeline_1.assignmentDay)(effectiveFrom) !== from)
            throw ApiError_1.ApiError.badRequest('Assignment start date must be a valid YYYY-MM-DD date.');
        await this.assertAssignmentPeriodUnlocked(effectiveFrom);
        if (isPrimary && primaryRows.some((r) => !r.effectiveTo || (0, assignmentTimeline_1.assignmentDay)(r.effectiveTo) >= (0, assignmentTimeline_1.assignmentDay)(effectiveFrom))) {
            throw ApiError_1.ApiError.conflict('A primary assignment already covers today. Correct its effective dates before adding another primary.');
        }
        const assignment = await PrimarySiteAssignment_1.PrimarySiteAssignment.create({
            guardId: data.guardId, siteId: data.siteId, role: data.role || 'GUARD',
            isPrimary,
            standardMonthlyHours: 240, hourlyRate: profile?.rate || 0,
            transportAllowance: profile?.transportAllowance || 0, effectiveFrom, isCurrent: true,
        });
        if (isPrimary) {
            employee.homeSiteId = data.siteId;
            await employee.save();
        }
        if (auditCtx) {
            AuditService_1.AuditService.log({ userId: auditCtx.userId, action: 'GUARD_ASSIGN_SITE', entity: 'PrimarySiteAssignment', entityId: assignment._id.toString(), newValues: { guardId: data.guardId, siteId: data.siteId, role: data.role || 'GUARD', isPrimary }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
        }
        EventBus_1.eventBus.emit('hr.guard.siteAssigned', { guardId: data.guardId, siteId: data.siteId, assignmentId: assignment._id, role: data.role || 'GUARD', isPrimary });
        return assignment;
    }
    /**
     * Operations can move the Primary Site later. The flag lives on the
     * assignment itself (never inferred from array order) and homeSiteId is kept
     * in sync. Historical attendance stays attached to the site it was recorded
     * at — nothing about attendance rows changes here.
     */
    static async setPrimarySite(guardId, siteId, auditCtx) {
        return (0, payrollTransaction_1.payrollTransaction)(async () => {
            await Employee_1.Employee.updateOne({ _id: guardId }, { $inc: { __v: 1 } });
            return this.setPrimaryTransactional(guardId, siteId, auditCtx);
        });
    }
    static async setPrimaryTransactional(guardId, siteId, auditCtx) {
        const employee = await Employee_1.Employee.findById(guardId);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Guard not found');
        const target = await PrimarySiteAssignment_1.PrimarySiteAssignment.findOne({ guardId, siteId, isCurrent: true });
        if (!target)
            throw ApiError_1.ApiError.badRequest('The guard has no active assignment for that site — the primary site must be an active assignment');
        const current = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId, isCurrent: true });
        const previousPrimary = current.find((a) => a.isPrimary);
        if (previousPrimary && previousPrimary._id.toString() === target._id.toString())
            return target;
        const history = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId, isPrimary: true });
        if ((0, assignmentTimeline_1.primaryOverlaps)(history).length)
            throw ApiError_1.ApiError.conflict('Primary history overlaps. Correct the conflicting assignments with a reason before changing the primary site.');
        const changeDate = new Date(`${(0, assignmentTimeline_1.assignmentDay)(new Date())}T00:00:00.000Z`);
        // Preserve prior primary roles. New role starts tomorrow; old role ends today.
        changeDate.setUTCDate(changeDate.getUTCDate() + 1);
        await this.assertAssignmentPeriodUnlocked(changeDate);
        const endDate = new Date(changeDate.getTime() - 86400000);
        let replacement = target;
        for (const row of current.filter((a) => a.isPrimary || a._id.toString() === target._id.toString())) {
            if ((0, assignmentTimeline_1.assignmentDay)(row.effectiveFrom) >= (0, assignmentTimeline_1.assignmentDay)(changeDate))
                throw ApiError_1.ApiError.conflict('A future assignment role change is already scheduled. Correct its dates before scheduling another.');
            const values = row.toObject();
            row.isCurrent = false;
            row.effectiveTo = endDate;
            await row.save();
            const { _id, createdAt, updatedAt, __v, ...rest } = values;
            const created = await PrimarySiteAssignment_1.PrimarySiteAssignment.create({ ...rest, effectiveFrom: changeDate, effectiveTo: null,
                isCurrent: true, isPrimary: row._id.toString() === target._id.toString() });
            if (created.isPrimary)
                replacement = created;
        }
        target.isPrimary = false; // return value below uses the new historical role row
        employee.homeSiteId = siteId;
        await employee.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId, action: 'GUARD_PRIMARY_SITE_UPDATE', entity: 'PrimarySiteAssignment',
                entityId: target._id.toString(),
                oldValues: { primarySiteId: previousPrimary ? previousPrimary.siteId.toString() : null },
                newValues: { primarySiteId: siteId },
                ipAddress: auditCtx.ip, userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.guard.primarySiteChanged', { guardId, siteId, assignmentId: replacement._id });
        return replacement;
    }
    static async assertAssignmentPeriodUnlocked(date) {
        const locked = await GuardPayrollRun_1.GuardPayrollRun.exists({ periodKey: (0, assignmentTimeline_1.assignmentDay)(date).slice(0, 7),
            status: { $nin: ['DRAFT', 'CALCULATED', 'RETURNED'] } });
        if (locked)
            throw ApiError_1.ApiError.conflict('Assignment changes affect locked payroll. Return that payroll for correction first.');
    }
    /** Explicit correction preserves IDs and requires a reason; never deletes history. */
    static async correctAssignment(assignmentId, input, auditCtx) {
        if (!input.reason?.trim())
            throw ApiError_1.ApiError.badRequest('A reason is required for assignment history correction.');
        if (typeof input.isPrimary !== 'boolean')
            throw ApiError_1.ApiError.badRequest('Specify whether this assignment is primary.');
        const parse = (value) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
                throw ApiError_1.ApiError.badRequest('Assignment dates must use YYYY-MM-DD.');
            const date = new Date(`${value}T00:00:00.000Z`);
            if (!Number.isFinite(date.getTime()) || (0, assignmentTimeline_1.assignmentDay)(date) !== value)
                throw ApiError_1.ApiError.badRequest('Invalid assignment date.');
            return date;
        };
        const from = parse(input.effectiveFrom);
        const to = input.effectiveTo ? parse(input.effectiveTo) : undefined;
        if (to && to < from)
            throw ApiError_1.ApiError.badRequest('End date must be on or after the start date (inclusive).');
        return (0, payrollTransaction_1.payrollTransaction)(async () => {
            const row = await PrimarySiteAssignment_1.PrimarySiteAssignment.findById(assignmentId);
            if (!row)
                throw ApiError_1.ApiError.notFound('Assignment not found');
            await Employee_1.Employee.updateOne({ _id: row.guardId }, { $inc: { __v: 1 } });
            const oldValues = row.toObject();
            const first = (0, assignmentTimeline_1.assignmentDay)(from < row.effectiveFrom ? from : row.effectiveFrom).slice(0, 7);
            const last = (0, assignmentTimeline_1.assignmentDay)(!to || !row.effectiveTo ? new Date('2100-12-31') : to > row.effectiveTo ? to : row.effectiveTo).slice(0, 7);
            if (await GuardPayrollRun_1.GuardPayrollRun.exists({ periodKey: { $gte: first, $lte: last }, status: { $nin: ['DRAFT', 'CALCULATED', 'RETURNED'] } })) {
                throw ApiError_1.ApiError.conflict('This correction intersects finalized payroll. Return affected runs before correcting; paid snapshots cannot be reopened.');
            }
            const others = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: row.guardId, _id: { $ne: row._id }, isPrimary: true });
            if ((0, assignmentTimeline_1.primaryOverlaps)([...others, { _id: row._id, isPrimary: input.isPrimary, effectiveFrom: from, effectiveTo: to }]).length) {
                throw ApiError_1.ApiError.conflict('The correction still overlaps another primary assignment. End the older interval before the next start date.');
            }
            row.effectiveFrom = from;
            row.effectiveTo = to;
            row.isPrimary = input.isPrimary;
            row.isCurrent = !to;
            await row.save();
            await AuditService_1.AuditService.log({ ...auditCtx, action: 'GUARD_ASSIGNMENT_HISTORY_CORRECT', entity: 'PrimarySiteAssignment', entityId: assignmentId,
                oldValues: { ...oldValues }, newValues: { ...row.toObject() }, reason: input.reason.trim(), ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
            return row;
        });
    }
    static async getGuardSites(guardId) {
        return PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId }).populate('siteId').sort({ effectiveFrom: -1 });
    }
    static async removeSiteAssignment(assignmentId, auditCtx) {
        return (0, payrollTransaction_1.payrollTransaction)(async () => {
            const row = await PrimarySiteAssignment_1.PrimarySiteAssignment.findById(assignmentId);
            if (!row)
                throw ApiError_1.ApiError.notFound('Assignment not found');
            await Employee_1.Employee.updateOne({ _id: row.guardId }, { $inc: { __v: 1 } });
            return this.removeAssignmentTransactional(assignmentId, auditCtx);
        });
    }
    static async removeAssignmentTransactional(assignmentId, auditCtx) {
        const assignment = await PrimarySiteAssignment_1.PrimarySiteAssignment.findById(assignmentId);
        if (!assignment)
            throw ApiError_1.ApiError.notFound('Assignment not found');
        if (!assignment.isCurrent)
            throw ApiError_1.ApiError.conflict('This assignment is already closed. Use audited history correction to change its dates.');
        const today = new Date(`${(0, assignmentTimeline_1.assignmentDay)(new Date())}T00:00:00.000Z`);
        await this.assertAssignmentPeriodUnlocked(today);
        if ((0, assignmentTimeline_1.assignmentDay)(assignment.effectiveFrom) > (0, assignmentTimeline_1.assignmentDay)(today))
            throw ApiError_1.ApiError.conflict('This assignment starts in the future. Use audited history correction.');
        assignment.isCurrent = false;
        // Keep isPrimary as historical evidence; do not silently promote another site.
        assignment.effectiveTo = today;
        await assignment.save();
        // The primary site must always be one of the guard's ACTIVE assignments:
        // if we just relieved the primary, promote another active one (or clear it).
        if (assignment.guardId) {
            const remaining = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: assignment.guardId, isCurrent: true });
            const next = remaining.find((a) => a.isPrimary);
            await Employee_1.Employee.updateOne({ _id: assignment.guardId }, { $set: { homeSiteId: next ? next.siteId : null } });
        }
        if (auditCtx) {
            AuditService_1.AuditService.log({ userId: auditCtx.userId, action: 'GUARD_REMOVE_SITE', entity: 'PrimarySiteAssignment', entityId: assignmentId, oldValues: { guardId: assignment.guardId.toString(), siteId: assignment.siteId.toString(), isCurrent: true }, newValues: { isCurrent: false }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
        }
        EventBus_1.eventBus.emit('hr.guard.siteRemoved', { guardId: assignment.guardId, siteId: assignment.siteId, assignmentId });
        return assignment;
    }
    /**
     * Guard roster with profiles + current site assignments.
     * Optional filters:
     *  - siteId      → only guards currently assigned to that site (isCurrent: true)
     *  - assignment  → 'assigned' | 'unassigned' — whether the guard holds any current site assignment
     *  - status      → employee status (ACTIVE, CONTRACTED, …); 'active' short-cut = ACTIVE or CONTRACTED
     *  - search      → matches name or employee code
     */
    static async getAllGuards(filters = {}) {
        const employeeQuery = { category: types_1.EmployeeCategory.GUARD };
        if (filters.status && filters.status !== 'active')
            employeeQuery.status = filters.status;
        else if (filters.status === 'active')
            employeeQuery.status = { $in: [types_1.EmployeeStatus.ACTIVE, types_1.EmployeeStatus.CONTRACTED] };
        if (filters.search) {
            const rx = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            employeeQuery.$or = [{ firstName: rx }, { lastName: rx }, { employeeCode: rx }];
        }
        const employees = await Employee_1.Employee.find(employeeQuery).sort({ employeeCode: 1 });
        const rows = await Promise.all(employees.map(async (emp) => {
            const profile = await GuardProfile_1.GuardProfile.findOne({ employeeId: emp._id });
            const currentAssignments = await PrimarySiteAssignment_1.PrimarySiteAssignment.find({ guardId: emp._id, isCurrent: true }).populate('siteId');
            return { employee: emp, profile, currentAssignments };
        }));
        return rows.filter((row) => {
            if (filters.siteId) {
                const match = row.currentAssignments.some((a) => (a.siteId?._id || a.siteId)?.toString() === filters.siteId);
                if (!match)
                    return false;
            }
            if (filters.assignment === 'assigned' && row.currentAssignments.length === 0)
                return false;
            if (filters.assignment === 'unassigned' && row.currentAssignments.length > 0)
                return false;
            return true;
        });
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