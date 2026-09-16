import { Employee, IEmployee } from '../../../models/Employee';
import { ApiError } from '../../../common/ApiError';
import { EmployeeCategory, EmployeeStatus } from '../../../types';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class EmployeeService {
  static async getAll(query: { page?: number; limit?: number; category?: EmployeeCategory; status?: EmployeeStatus; search?: string }) {
    const { page = 1, limit = 20, category, status, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Employee.countDocuments(filter),
    ]);

    return { data: employees, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string): Promise<IEmployee> {
    const employee = await Employee.findById(id);
    if (!employee) throw ApiError.notFound('Employee not found');
    return employee;
  }

  static async create(data: Partial<IEmployee>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IEmployee> {
    const existing = await Employee.findOne({ employeeCode: data.employeeCode });
    if (existing) throw ApiError.conflict('Employee code already exists');
    const employee = await Employee.create(data);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'EMPLOYEE_CREATE',
        entity: 'Employee',
        entityId: (employee._id as any).toString(),
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.employee.created', { employeeId: employee._id, employeeCode: employee.employeeCode });

    return employee;
  }

  static async update(id: string, data: Partial<IEmployee>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IEmployee> {
    const old = await Employee.findById(id);
    if (!old) throw ApiError.notFound('Employee not found');
    const oldValues = old.toObject();

    const employee = await Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!employee) throw ApiError.notFound('Employee not found');

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'EMPLOYEE_UPDATE',
        entity: 'Employee',
        entityId: id,
        oldValues: { firstName: oldValues.firstName, lastName: oldValues.lastName, email: oldValues.email, status: oldValues.status },
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.employee.updated', { employeeId: id });

    return employee;
  }

  static async delete(id: string, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<void> {
    const employee = await Employee.findById(id);
    if (!employee) throw ApiError.notFound('Employee not found');
    const snapshot = employee.toObject();

    await Employee.findByIdAndDelete(id);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'EMPLOYEE_DELETE',
        entity: 'Employee',
        entityId: id,
        oldValues: { employeeCode: snapshot.employeeCode, firstName: snapshot.firstName, lastName: snapshot.lastName },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.employee.deleted', { employeeId: id, employeeCode: snapshot.employeeCode });
  }

  static async getGuards(query: { page?: number; limit?: number; search?: string }) {
    return this.getAll({ ...query, category: EmployeeCategory.GUARD });
  }

  static async getOfficeStaff(query: { page?: number; limit?: number; search?: string }) {
    return this.getAll({ ...query, category: EmployeeCategory.OFFICE_STAFF });
  }

  static async changeStatus(
    id: string,
    data: { status: EmployeeStatus; reason: string },
    auditCtx?: { userId: string; ip?: string; ua?: string }
  ): Promise<IEmployee> {
    const employee = await Employee.findById(id);
    if (!employee) throw ApiError.notFound('Employee not found');

    const to = data.status;
    if (!Object.values(EmployeeStatus).includes(to)) {
      throw ApiError.badRequest(`Invalid status. Allowed: ${Object.values(EmployeeStatus).join(', ')}`);
    }
    const reason = (data.reason || '').trim();
    if (!reason || reason.length < 3) {
      throw ApiError.badRequest('A reason (minimum 3 characters) is required to change employee status');
    }
    if (employee.status === to) {
      throw ApiError.badRequest(`Employee is already ${to}`);
    }

    const from = employee.status;
    employee.status = to;
    employee.statusHistory = [
      ...(employee.statusHistory || []),
      {
        from,
        to,
        reason,
        changedBy: (auditCtx?.userId as any) || null,
        changedAt: new Date(),
      },
    ];
    await employee.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'EMPLOYEE_STATUS_CHANGE',
        entity: 'Employee',
        entityId: id,
        oldValues: { status: from },
        newValues: { status: to, reason },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.employee.statusChanged', { employeeId: id, from, to, reason });

    return employee;
  }

  private static statusAtMonthEnd(emp: any, monthEnd: Date): EmployeeStatus {
    const history = (emp.statusHistory || [])
      .filter((h: any) => h.changedAt && new Date(h.changedAt) <= monthEnd)
      .sort((a: any, b: any) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
    if (history.length > 0) return history[history.length - 1].to as EmployeeStatus;
    return emp.status as EmployeeStatus;
  }

  static async getAnalytics(months = 6) {
    const count = Math.min(Math.max(parseInt(String(months)) || 6, 1), 24);
    const employees = await Employee.find({}).lean();

    const byStatus: Record<string, number> = {};
    for (const s of Object.values(EmployeeStatus)) byStatus[s] = 0;
    const byCategory: Record<string, { total: number; active: number; inactive: number }> = {
      [EmployeeCategory.GUARD]: { total: 0, active: 0, inactive: 0 },
      [EmployeeCategory.OFFICE_STAFF]: { total: 0, active: 0, inactive: 0 },
    };
    const isActive = (s: string) => s === EmployeeStatus.ACTIVE || s === EmployeeStatus.CONTRACTED;
    const isInactive = (s: string) => s === EmployeeStatus.INACTIVE || s === EmployeeStatus.TERMINATED;

    for (const emp of employees) {
      const st = (emp as any).status as string;
      if (byStatus[st] !== undefined) byStatus[st] += 1;
      const cat = byCategory[(emp as any).category];
      if (cat) {
        cat.total += 1;
        if (isActive(st)) cat.active += 1;
        if (isInactive(st)) cat.inactive += 1;
      }
    }

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const now = new Date();
    const trend: { year: number; month: number; monthName: string; active: number; inactive: number; onLeave: number; newHires: number; deactivated: number }[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

      let active = 0, inactive = 0, onLeave = 0, newHires = 0, deactivated = 0;
      for (const emp of employees) {
        const start = (emp as any).hireDate ? new Date((emp as any).hireDate) : (emp as any).createdAt ? new Date((emp as any).createdAt) : null;
        if (!start || start > monthEnd) continue;
        if (start >= monthStart && start <= monthEnd) newHires += 1;
        const st = this.statusAtMonthEnd(emp, monthEnd);
        if (isActive(st)) active += 1;
        else if (isInactive(st)) inactive += 1;
        else if (st === EmployeeStatus.ON_LEAVE) onLeave += 1;
        for (const h of ((emp as any).statusHistory || [])) {
          const when = h.changedAt ? new Date(h.changedAt) : null;
          if (when && when >= monthStart && when <= monthEnd && (h.to === EmployeeStatus.INACTIVE || h.to === EmployeeStatus.TERMINATED)) {
            deactivated += 1;
          }
        }
      }
      trend.push({ year: y, month: m, monthName: monthNames[m - 1], active, inactive, onLeave, newHires, deactivated });
    }

    return {
      total: employees.length,
      byStatus,
      byCategory,
      activeTotal: (byStatus[EmployeeStatus.ACTIVE] || 0) + (byStatus[EmployeeStatus.CONTRACTED] || 0),
      inactiveTotal: (byStatus[EmployeeStatus.INACTIVE] || 0) + (byStatus[EmployeeStatus.TERMINATED] || 0),
      trend,
      generatedAt: new Date().toISOString(),
    };
  }
}
