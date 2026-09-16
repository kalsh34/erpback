"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const employee_service_1 = require("./employee.service");
const Employee_1 = require("../../../models/Employee");
const Contract_1 = require("../../../models/Contract");
class EmployeeController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, category, status, search } = req.query;
            const result = await employee_service_1.EmployeeService.getAll({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                category: category,
                status: status,
                search: search,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const employee = await employee_service_1.EmployeeService.getById(req.params.id);
            res.json({ success: true, data: employee });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const employee = await employee_service_1.EmployeeService.create(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: employee });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const employee = await employee_service_1.EmployeeService.update(req.params.id, req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: employee });
        }
        catch (error) {
            next(error);
        }
    }
    static async changeStatus(req, res, next) {
        try {
            const employee = await employee_service_1.EmployeeService.changeStatus(req.params.id, req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: employee });
        }
        catch (error) {
            next(error);
        }
    }
    static async analytics(req, res, next) {
        try {
            const months = parseInt(req.query.months) || 6;
            const result = await employee_service_1.EmployeeService.getAnalytics(months);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await employee_service_1.EmployeeService.delete(req.params.id, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, message: 'Employee deleted' });
        }
        catch (error) {
            next(error);
        }
    }
    static async getGuards(req, res, next) {
        try {
            const { page, limit, search } = req.query;
            const result = await employee_service_1.EmployeeService.getGuards({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                search: search,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getOfficeStaff(req, res, next) {
        try {
            const { page, limit, search } = req.query;
            const result = await employee_service_1.EmployeeService.getOfficeStaff({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                search: search,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async exportCsv(_req, res, next) {
        try {
            const employees = await Employee_1.Employee.find({}).sort({ employeeCode: 1 }).lean();
            const employeeIds = employees.map((e) => e._id);
            const contracts = await Contract_1.Contract.find({ employeeId: { $in: employeeIds } }).populate('salaryStructureId').lean();
            const contractMap = new Map();
            for (const c of contracts) {
                const eid = c.employeeId?._id?.toString() || c.employeeId?.toString();
                if (eid)
                    contractMap.set(eid, c);
            }
            const headers = [
                'Code', 'First Name', 'Last Name', 'Category', 'Status', 'Department', 'Position',
                'Phone', 'Email', 'Gender',
                'Wage/Salary', 'Bank Name', 'Account Number',
                'Contract Start', 'Contract Type', 'Pension Enrolled',
                'OT Multiplier', 'Holiday Multiplier',
            ];
            const rows = employees.map((e) => {
                const contract = contractMap.get(e._id.toString());
                const structure = contract?.salaryStructureId;
                return [
                    e.employeeCode,
                    e.firstName,
                    e.lastName,
                    e.category,
                    e.status,
                    e.department || '',
                    e.position || '',
                    e.phone || '',
                    e.email || '',
                    e.gender || '',
                    contract?.wage || '',
                    e.bankName || '',
                    e.accountNumber || '',
                    contract?.contractStartDate ? new Date(contract.contractStartDate).toISOString().split('T')[0] : '',
                    contract?.contractType || '',
                    contract?.pensionEnrolled !== undefined ? (contract.pensionEnrolled ? 'Yes' : 'No') : '',
                    structure?.otMultiplier || '',
                    structure?.holidayMultiplier || '',
                ];
            });
            const csv = [headers, ...rows].map(row => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=employees-${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.EmployeeController = EmployeeController;
//# sourceMappingURL=employee.controller.js.map