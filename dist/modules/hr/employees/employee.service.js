"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const Employee_1 = require("../../../models/Employee");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class EmployeeService {
    static async getAll(query) {
        const { page = 1, limit = 20, category, status, search } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (category)
            filter.category = category;
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { employeeCode: { $regex: search, $options: 'i' } },
            ];
        }
        const [employees, total] = await Promise.all([
            Employee_1.Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Employee_1.Employee.countDocuments(filter),
        ]);
        return { data: employees, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const employee = await Employee_1.Employee.findById(id);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        return employee;
    }
    static async create(data, auditCtx) {
        const existing = await Employee_1.Employee.findOne({ employeeCode: data.employeeCode });
        if (existing)
            throw ApiError_1.ApiError.conflict('Employee code already exists');
        const employee = await Employee_1.Employee.create(data);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'EMPLOYEE_CREATE',
                entity: 'Employee',
                entityId: employee._id.toString(),
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.employee.created', { employeeId: employee._id, employeeCode: employee.employeeCode });
        return employee;
    }
    static async update(id, data, auditCtx) {
        const old = await Employee_1.Employee.findById(id);
        if (!old)
            throw ApiError_1.ApiError.notFound('Employee not found');
        const oldValues = old.toObject();
        const employee = await Employee_1.Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'EMPLOYEE_UPDATE',
                entity: 'Employee',
                entityId: id,
                oldValues: { firstName: oldValues.firstName, lastName: oldValues.lastName, email: oldValues.email, status: oldValues.status },
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.employee.updated', { employeeId: id });
        return employee;
    }
    static async delete(id, auditCtx) {
        const employee = await Employee_1.Employee.findById(id);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        const snapshot = employee.toObject();
        await Employee_1.Employee.findByIdAndDelete(id);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'EMPLOYEE_DELETE',
                entity: 'Employee',
                entityId: id,
                oldValues: { employeeCode: snapshot.employeeCode, firstName: snapshot.firstName, lastName: snapshot.lastName },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.employee.deleted', { employeeId: id, employeeCode: snapshot.employeeCode });
    }
    static async getGuards(query) {
        return this.getAll({ ...query, category: types_1.EmployeeCategory.GUARD });
    }
    static async getOfficeStaff(query) {
        return this.getAll({ ...query, category: types_1.EmployeeCategory.OFFICE_STAFF });
    }
    static async changeStatus(id, data, auditCtx) {
        const employee = await Employee_1.Employee.findById(id);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        const to = data.status;
        if (!Object.values(types_1.EmployeeStatus).includes(to)) {
            throw ApiError_1.ApiError.badRequest(`Invalid status. Allowed: ${Object.values(types_1.EmployeeStatus).join(', ')}`);
        }
        const reason = (data.reason || '').trim();
        if (!reason || reason.length < 3) {
            throw ApiError_1.ApiError.badRequest('A reason (minimum 3 characters) is required to change employee status');
        }
        if (employee.status === to) {
            throw ApiError_1.ApiError.badRequest(`Employee is already ${to}`);
        }
        const from = employee.status;
        employee.status = to;
        employee.statusHistory = [
            ...(employee.statusHistory || []),
            {
                from,
                to,
                reason,
                changedBy: auditCtx?.userId || null,
                changedAt: new Date(),
            },
        ];
        await employee.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
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
        EventBus_1.eventBus.emit('hr.employee.statusChanged', { employeeId: id, from, to, reason });
        return employee;
    }
    static statusAtMonthEnd(emp, monthEnd) {
        const history = (emp.statusHistory || [])
            .filter((h) => h.changedAt && new Date(h.changedAt) <= monthEnd)
            .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
        if (history.length > 0)
            return history[history.length - 1].to;
        return emp.status;
    }
    static async getAnalytics(months = 6) {
        const count = Math.min(Math.max(parseInt(String(months)) || 6, 1), 24);
        const employees = await Employee_1.Employee.find({}).lean();
        const byStatus = {};
        for (const s of Object.values(types_1.EmployeeStatus))
            byStatus[s] = 0;
        const byCategory = {
            [types_1.EmployeeCategory.GUARD]: { total: 0, active: 0, inactive: 0 },
            [types_1.EmployeeCategory.OFFICE_STAFF]: { total: 0, active: 0, inactive: 0 },
        };
        const isActive = (s) => s === types_1.EmployeeStatus.ACTIVE || s === types_1.EmployeeStatus.CONTRACTED;
        const isInactive = (s) => s === types_1.EmployeeStatus.INACTIVE || s === types_1.EmployeeStatus.TERMINATED;
        for (const emp of employees) {
            const st = emp.status;
            if (byStatus[st] !== undefined)
                byStatus[st] += 1;
            const cat = byCategory[emp.category];
            if (cat) {
                cat.total += 1;
                if (isActive(st))
                    cat.active += 1;
                if (isInactive(st))
                    cat.inactive += 1;
            }
        }
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const now = new Date();
        const trend = [];
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const monthStart = new Date(y, m - 1, 1);
            const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
            let active = 0, inactive = 0, onLeave = 0, newHires = 0, deactivated = 0;
            for (const emp of employees) {
                const start = emp.hireDate ? new Date(emp.hireDate) : emp.createdAt ? new Date(emp.createdAt) : null;
                if (!start || start > monthEnd)
                    continue;
                if (start >= monthStart && start <= monthEnd)
                    newHires += 1;
                const st = this.statusAtMonthEnd(emp, monthEnd);
                if (isActive(st))
                    active += 1;
                else if (isInactive(st))
                    inactive += 1;
                else if (st === types_1.EmployeeStatus.ON_LEAVE)
                    onLeave += 1;
                for (const h of (emp.statusHistory || [])) {
                    const when = h.changedAt ? new Date(h.changedAt) : null;
                    if (when && when >= monthStart && when <= monthEnd && (h.to === types_1.EmployeeStatus.INACTIVE || h.to === types_1.EmployeeStatus.TERMINATED)) {
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
            activeTotal: (byStatus[types_1.EmployeeStatus.ACTIVE] || 0) + (byStatus[types_1.EmployeeStatus.CONTRACTED] || 0),
            inactiveTotal: (byStatus[types_1.EmployeeStatus.INACTIVE] || 0) + (byStatus[types_1.EmployeeStatus.TERMINATED] || 0),
            trend,
            generatedAt: new Date().toISOString(),
        };
    }
}
exports.EmployeeService = EmployeeService;
//# sourceMappingURL=employee.service.js.map