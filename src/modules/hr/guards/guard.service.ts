import mongoose from 'mongoose';
import { Employee } from '../../../models/Employee';
import { GuardProfile } from '../../../models/GuardProfile';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { User } from '../../../models/User';
import { Site } from '../../../models/Site';
import { Organization } from '../../../core/organizations/Organization';
import { ApiError } from '../../../common/ApiError';
import { EmployeeCategory, UserRole, GuardPosition } from '../../../types';
import bcrypt from 'bcryptjs';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

let _supportsTransactions: boolean | null = null;

async function supportsTransactions(): Promise<boolean> {
  if (_supportsTransactions !== null) return _supportsTransactions;
  try {
    const admin = mongoose.connection.db!.admin();
    const status = await admin.command({ replSetGetStatus: 1 } as any);
    _supportsTransactions = !!(status as any).set;
  } catch {
    _supportsTransactions = false;
  }
  return _supportsTransactions;
}

export class GuardService {
  static async registerGuard(data: {
    firstName: string; lastName: string; phone?: string; idCardNumber?: string;
    employmentType: string; email: string; password: string; rate?: number;
    transportAllowance?: number; homeSiteId?: string;
  }, auditCtx?: { userId: string; ip?: string; ua?: string }) {
    const useTxn = await supportsTransactions();
    let session: mongoose.ClientSession | null = null;
    if (useTxn) { session = await mongoose.startSession(); session.startTransaction(); }
    const createdDocs: { model: any; doc: any }[] = [];
    try {
      const existingEmployee = await Employee.findOne({ email: data.email }, undefined, session ? { session } : undefined);
      if (existingEmployee) throw ApiError.conflict('Email already used by an employee');
      const prefix = 'VSP';
      const org = await Organization.findOneAndUpdate({ employeeCodePrefix: prefix }, { $inc: { nextEmployeeCode: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
      const nextCode = `${prefix}-${org!.nextEmployeeCode}`;
      const [employee] = await Employee.create([{
        employeeCode: nextCode, firstName: data.firstName, lastName: data.lastName,
        phone: data.phone, email: data.email, category: EmployeeCategory.GUARD,
        hireDate: new Date(), homeSiteId: data.homeSiteId || undefined,
        guardInfo: { employmentType: data.employmentType, idCardNumber: data.idCardNumber },
      }], session ? { session } : undefined);
      createdDocs.push({ model: Employee, doc: employee });
      const [profile] = await GuardProfile.create([{
        employeeId: employee._id, position: GuardPosition.GUARD,
        employmentType: data.employmentType, idCardNumber: data.idCardNumber,
        rate: data.rate || 0, transportAllowance: data.transportAllowance || 0,
      }], session ? { session } : undefined);
      createdDocs.push({ model: GuardProfile, doc: profile });
      const hash = await bcrypt.hash(data.password, 12);
      const [user] = await User.create([{
        email: data.email, password: hash, firstName: data.firstName,
        lastName: data.lastName, role: UserRole.GUARD, employeeId: employee._id,
      }], session ? { session } : undefined);
      createdDocs.push({ model: User, doc: user });
      if (session) { await session.commitTransaction(); session.endSession(); }
      if (auditCtx) {
        AuditService.log({ userId: auditCtx.userId, action: 'GUARD_REGISTER', entity: 'Employee', entityId: employee._id.toString(), newValues: { employeeCode: nextCode, firstName: data.firstName, lastName: data.lastName, email: data.email }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
      }
      eventBus.emit('hr.guard.registered', { employeeId: employee._id, employeeCode: nextCode });
      return { employee, user: { email: user.email, role: user.role } };
    } catch (err) {
      if (session) { try { await session.abortTransaction(); } catch { } session.endSession(); }
      for (const { model, doc } of createdDocs) { await model.deleteOne({ _id: doc._id }).catch(() => { }); }
      throw err;
    }
  }

  static async assignSite(data: { guardId: string; siteId: string; role?: 'GUARD' | 'SUPERVISOR' }, auditCtx?: { userId: string; ip?: string; ua?: string }) {
    const employee = await Employee.findById(data.guardId);
    if (!employee) throw ApiError.notFound('Guard not found');
    if (employee.category !== EmployeeCategory.GUARD) throw ApiError.badRequest('Employee is not a guard');
    const site = await Site.findById(data.siteId);
    if (!site) throw ApiError.notFound('Site not found');
    const existing = await PrimarySiteAssignment.findOne({ guardId: data.guardId, siteId: data.siteId, isCurrent: true });
    if (existing) throw ApiError.conflict('Guard is already assigned to this site');
    const profile = await GuardProfile.findOne({ employeeId: data.guardId });
    const assignment = await PrimarySiteAssignment.create({
      guardId: data.guardId, siteId: data.siteId, role: data.role || 'GUARD',
      standardMonthlyHours: 208, hourlyRate: profile?.rate || 0,
      transportAllowance: profile?.transportAllowance || 0, effectiveFrom: new Date(), isCurrent: true,
    });
    if (auditCtx) {
      AuditService.log({ userId: auditCtx.userId, action: 'GUARD_ASSIGN_SITE', entity: 'PrimarySiteAssignment', entityId: assignment._id.toString(), newValues: { guardId: data.guardId, siteId: data.siteId, role: data.role || 'GUARD' }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
    }
    eventBus.emit('hr.guard.siteAssigned', { guardId: data.guardId, siteId: data.siteId, assignmentId: assignment._id, role: data.role || 'GUARD' });
    return assignment;
  }

  static async getGuardSites(guardId: string) {
    return PrimarySiteAssignment.find({ guardId }).populate('siteId').sort({ effectiveFrom: -1 });
  }

  static async removeSiteAssignment(assignmentId: string, auditCtx?: { userId: string; ip?: string; ua?: string }) {
    const assignment = await PrimarySiteAssignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found');
    assignment.isCurrent = false;
    assignment.effectiveTo = new Date();
    await assignment.save();
    if (auditCtx) {
      AuditService.log({ userId: auditCtx.userId, action: 'GUARD_REMOVE_SITE', entity: 'PrimarySiteAssignment', entityId: assignmentId, oldValues: { guardId: assignment.guardId.toString(), siteId: assignment.siteId.toString(), isCurrent: true }, newValues: { isCurrent: false }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
    }
    eventBus.emit('hr.guard.siteRemoved', { guardId: assignment.guardId, siteId: assignment.siteId, assignmentId });
    return assignment;
  }

  static async getAllGuards() {
    const employees = await Employee.find({ category: EmployeeCategory.GUARD }).sort({ employeeCode: 1 });
    return Promise.all(employees.map(async (emp) => {
      const profile = await GuardProfile.findOne({ employeeId: emp._id });
      const currentAssignments = await PrimarySiteAssignment.find({ guardId: emp._id, isCurrent: true }).populate('siteId');
      return { employee: emp, profile, currentAssignments };
    }));
  }

  static async getGuardDetail(employeeId: string) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw ApiError.notFound('Guard not found');
    const profile = await GuardProfile.findOne({ employeeId });
    const assignments = await PrimarySiteAssignment.find({ guardId: employeeId }).populate('siteId').sort({ effectiveFrom: -1 });
    const user = await User.findOne({ employeeId });
    return { employee, profile, assignments, user: user ? { email: user.email, role: user.role, isActive: user.isActive } : null };
  }

  static async updateGuard(employeeId: string, data: any, auditCtx?: { userId: string; ip?: string; ua?: string }) {
    const old = await Employee.findById(employeeId);
    if (!old) throw ApiError.notFound('Guard not found');
    const oldValues = old.toObject();
    const employee = await Employee.findByIdAndUpdate(employeeId, data, { new: true, runValidators: true });
    if (!employee) throw ApiError.notFound('Guard not found');
    if (auditCtx) {
      AuditService.log({ userId: auditCtx.userId, action: 'GUARD_UPDATE', entity: 'Employee', entityId: employeeId, oldValues: { firstName: oldValues.firstName, lastName: oldValues.lastName, phone: oldValues.phone }, newValues: data, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
    }
    eventBus.emit('hr.guard.updated', { employeeId });
    return employee;
  }

  static async updateGuardPayRate(assignmentId: string, hourlyRate: number, auditCtx?: { userId: string; ip?: string; ua?: string }) {
    const assignment = await PrimarySiteAssignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found');
    const oldRate = assignment.hourlyRate;
    assignment.hourlyRate = hourlyRate;
    await assignment.save();
    if (auditCtx) {
      AuditService.log({ userId: auditCtx.userId, action: 'GUARD_PAY_RATE_UPDATE', entity: 'PrimarySiteAssignment', entityId: assignmentId, oldValues: { hourlyRate: oldRate }, newValues: { hourlyRate }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
    }
    eventBus.emit('hr.guard.payRateUpdated', { assignmentId, hourlyRate });
    return assignment;
  }

  static async setHomeSite(employeeId: string, homeSiteId: string | null, auditCtx?: { userId: string; ip?: string; ua?: string }) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw ApiError.notFound('Guard not found');
    if (homeSiteId) { const site = await Site.findById(homeSiteId); if (!site) throw ApiError.notFound('Site not found'); }
    const oldHomeSiteId = employee.homeSiteId;
    employee.homeSiteId = homeSiteId as any;
    await employee.save();
    if (auditCtx) {
      AuditService.log({ userId: auditCtx.userId, action: 'GUARD_HOME_SITE_UPDATE', entity: 'Employee', entityId: employeeId, oldValues: { homeSiteId: oldHomeSiteId?.toString() || null }, newValues: { homeSiteId }, ipAddress: auditCtx.ip, userAgent: auditCtx.ua });
    }
    return employee;
  }
}
