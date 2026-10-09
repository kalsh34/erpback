"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleReportsService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Employee_1 = require("../../models/Employee");
const Site_1 = require("../../models/Site");
const GuardAttendanceRecord_1 = require("../../models/GuardAttendanceRecord");
const StaffAttendance_1 = require("../../models/StaffAttendance");
const GuardPayrollRecord_1 = require("../../models/GuardPayrollRecord");
const StaffPayrollRecord_1 = require("../../models/StaffPayrollRecord");
const AuditLog_1 = require("../../models/AuditLog");
const User_1 = require("../../models/User");
const types_1 = require("../../types");
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Latest ACTIVE contract per employee (join date = contract start, then hire date). */
function contractLookup(stage) {
    void stage;
    return {
        $lookup: {
            from: 'contracts',
            let: { eid: '$_id' },
            pipeline: [
                { $match: { $expr: { $and: [{ $eq: ['$employeeId', '$$eid'] }, { $eq: ['$status', 'ACTIVE'] }] } } },
                { $sort: { contractStartDate: -1 } },
                { $limit: 1 },
            ],
            as: 'contract',
        },
    };
}
class ModuleReportsService {
    // ── HR ─────────────────────────────────────────────────────────────
    static async hrReport(q) {
        const match = {};
        if (q.category)
            match.category = q.category;
        if (q.status)
            match.status = q.status;
        if (q.department)
            match.department = { $regex: escapeRegex(q.department), $options: 'i' };
        if (q.search) {
            const rx = { $regex: escapeRegex(q.search), $options: 'i' };
            match.$or = [{ firstName: rx }, { lastName: rx }, { middleName: rx }, { employeeCode: rx }];
        }
        const rows = await Employee_1.Employee.aggregate([
            { $match: match },
            contractLookup('contract'),
            {
                $addFields: {
                    joinDate: {
                        $ifNull: [
                            { $arrayElemAt: ['$contract.contractStartDate', 0] },
                            '$hireDate',
                        ],
                    },
                    basicSalary: { $arrayElemAt: ['$contract.wage', 0] },
                    fullName: {
                        $trim: { input: { $concat: ['$firstName', ' ', { $ifNull: ['$middleName', ''] }, ' ', '$lastName'] } },
                    },
                },
            },
            ...(q.joinedFrom || q.joinedTo
                ? [{
                        $match: {
                            joinDate: {
                                ...(q.joinedFrom ? { $gte: new Date(q.joinedFrom) } : {}),
                                ...(q.joinedTo ? { $lte: new Date(`${q.joinedTo}T23:59:59.999Z`) } : {}),
                            },
                        },
                    }]
                : []),
            { $sort: { employeeCode: 1 } },
            {
                $project: {
                    _id: 0, employeeCode: 1, fullName: 1, category: 1, status: 1,
                    department: 1, position: 1, joinDate: 1, phone: 1, email: 1,
                    basicSalary: 1, bankName: 1, accountNumber: 1,
                },
            },
        ]);
        const totalMonthlyWage = rows.reduce((s, r) => s + (Number(r.basicSalary) || 0), 0);
        const byCategory = {};
        const byStatus = {};
        for (const r of rows) {
            byCategory[r.category] = (byCategory[r.category] || 0) + 1;
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        }
        return {
            report: 'HR_EMPLOYEES',
            generatedAt: new Date(),
            filters: q,
            summary: { total: rows.length, byCategory, byStatus, totalMonthlyWage: r2(totalMonthlyWage) },
            rows,
        };
    }
    // ── Sites ──────────────────────────────────────────────────────────
    static async sitesReport(q) {
        const match = {};
        if (q.status)
            match.status = q.status;
        if (q.siteType)
            match.siteType = q.siteType;
        if (q.search) {
            const rx = { $regex: escapeRegex(q.search), $options: 'i' };
            match.$or = [{ siteName: rx }, { siteCode: rx }, { client: rx }, { location: rx }];
        }
        const rows = await Site_1.Site.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'guardsitecompensations',
                    let: { sid: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$siteId', '$$sid'] }, isCurrent: true } },
                        { $sort: { effectiveFrom: -1 } },
                        { $limit: 1 },
                    ],
                    as: 'comp',
                },
            },
            {
                $addFields: {
                    currentCompensation: { $arrayElemAt: ['$comp.compensationAmount', 0] },
                },
            },
            { $sort: { siteCode: 1 } },
            {
                $project: {
                    _id: 0, siteCode: 1, siteName: 1, client: 1, location: 1, city: 1,
                    siteType: 1, status: 1, agreedManpower: 1, actualManpower: 1,
                    currentCompensation: 1, agreementStartDate: 1, agreementEndDate: 1,
                },
            },
        ]);
        const summary = {
            total: rows.length,
            active: rows.filter((r) => r.status === 'ACTIVE').length,
            totalAgreedManpower: rows.reduce((s, r) => s + (Number(r.agreedManpower) || 0), 0),
            totalActualManpower: rows.reduce((s, r) => s + (Number(r.actualManpower) || 0), 0),
            totalMonthlyCompensation: r2(rows.reduce((s, r) => s + (Number(r.currentCompensation) || 0), 0)),
        };
        return { report: 'SITES', generatedAt: new Date(), filters: q, summary, rows };
    }
    // ── Guards ─────────────────────────────────────────────────────────
    static async guardsReport(q) {
        const match = { category: types_1.EmployeeCategory.GUARD };
        if (q.status)
            match.status = q.status;
        const siteMatch = { isPrimary: true, isCurrent: true };
        if (q.siteId && mongoose_1.default.isValidObjectId(q.siteId))
            siteMatch.siteId = new mongoose_1.default.Types.ObjectId(q.siteId);
        const rows = await Employee_1.Employee.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'primarysiteassignments',
                    let: { eid: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$guardId', '$$eid'] }, ...siteMatch } },
                        { $sort: { effectiveFrom: -1 } },
                        { $limit: 1 },
                    ],
                    as: 'assign',
                },
            },
            { $addFields: { siteIdArr: { $arrayElemAt: ['$assign.siteId', 0] } } },
            {
                $lookup: { from: 'sites', localField: 'siteIdArr', foreignField: '_id', as: 'site' },
            },
            {
                $lookup: {
                    from: 'guardsitecompensations',
                    let: { sid: '$siteIdArr' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$siteId', '$$sid'] }, isCurrent: true } },
                        { $sort: { effectiveFrom: -1 } },
                        { $limit: 1 },
                    ],
                    as: 'comp',
                },
            },
            ...(q.month
                ? [{
                        $lookup: {
                            from: 'guardmonthlyhours',
                            let: { eid: '$_id', sid: '$siteIdArr' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $and: [{ $eq: ['$guardId', '$$eid'] }, { $eq: ['$siteId', '$$sid'] }] },
                                        periodKey: q.month,
                                    },
                                },
                                { $limit: 1 },
                            ],
                            as: 'hours',
                        },
                    }]
                : []),
            {
                $addFields: {
                    siteName: { $arrayElemAt: ['$site.siteName', 0] },
                    siteCode: { $arrayElemAt: ['$site.siteCode', 0] },
                    compensation: { $arrayElemAt: ['$comp.compensationAmount', 0] },
                    normalHours: { $ifNull: [{ $arrayElemAt: ['$hours.normalHours', 0] }, null] },
                    holidayHours: { $ifNull: [{ $arrayElemAt: ['$hours.holidayHours', 0] }, null] },
                    sundayHours: { $ifNull: [{ $arrayElemAt: ['$hours.sundayHours', 0] }, null] },
                    fullName: {
                        $trim: { input: { $concat: ['$firstName', ' ', { $ifNull: ['$middleName', ''] }, ' ', '$lastName'] } },
                    },
                },
            },
            { $sort: { employeeCode: 1 } },
            {
                $project: {
                    _id: 0, employeeCode: 1, fullName: 1, status: 1, siteName: 1, siteCode: 1,
                    compensation: 1, normalHours: 1, holidayHours: 1, sundayHours: 1, phone: 1,
                },
            },
        ]);
        const withHours = rows.filter((r) => r.normalHours != null);
        const summary = {
            total: rows.length,
            active: rows.filter((r) => r.status === types_1.EmployeeStatus.ACTIVE || r.status === types_1.EmployeeStatus.CONTRACTED).length,
            withPrimarySite: rows.filter((r) => r.siteName).length,
            withoutPrimarySite: rows.filter((r) => !r.siteName).length,
        };
        if (q.month) {
            summary.month = q.month;
            summary.reportedHours = withHours.length;
            summary.totalNormalHours = r2(withHours.reduce((s, r) => s + (Number(r.normalHours) || 0), 0));
            summary.totalHolidayHours = r2(withHours.reduce((s, r) => s + (Number(r.holidayHours) || 0), 0));
            summary.totalSundayHours = r2(withHours.reduce((s, r) => s + (Number(r.sundayHours) || 0), 0));
        }
        return { report: 'GUARDS', generatedAt: new Date(), filters: q, summary, rows };
    }
    // ── Guard attendance ───────────────────────────────────────────────
    static async guardAttendanceReport(q) {
        const match = {};
        if (q.month)
            match.periodKey = q.month;
        if (q.guardId && mongoose_1.default.isValidObjectId(q.guardId))
            match.guardId = new mongoose_1.default.Types.ObjectId(q.guardId);
        if (q.siteId && mongoose_1.default.isValidObjectId(q.siteId))
            match.siteId = new mongoose_1.default.Types.ObjectId(q.siteId);
        if (q.status)
            match.status = q.status;
        const rows = await GuardAttendanceRecord_1.GuardAttendanceRecord.aggregate([
            { $match: match },
            { $sort: { date: -1 } },
            { $limit: Math.min(q.limit || 500, 2000) },
            { $lookup: { from: 'employees', localField: 'guardId', foreignField: '_id', as: 'g' } },
            { $lookup: { from: 'sites', localField: 'siteId', foreignField: '_id', as: 's' } },
            {
                $project: {
                    _id: 0, date: 1, hoursWorked: 1, isHoliday: 1, status: 1, source: 1,
                    guardCode: { $arrayElemAt: ['$g.employeeCode', 0] },
                    guardName: {
                        $trim: {
                            input: {
                                $concat: [
                                    { $arrayElemAt: ['$g.firstName', 0] }, ' ',
                                    { $ifNull: [{ $arrayElemAt: ['$g.middleName', 0] }, ''] }, ' ',
                                    { $arrayElemAt: ['$g.lastName', 0] },
                                ],
                            },
                        },
                    },
                    siteName: { $arrayElemAt: ['$s.siteName', 0] },
                },
            },
        ]);
        const active = rows.filter((r) => r.status === 'ACTIVE');
        return {
            report: 'GUARD_ATTENDANCE',
            generatedAt: new Date(),
            filters: q,
            summary: {
                records: rows.length,
                activeRecords: active.length,
                voided: rows.filter((r) => r.status === 'VOID').length,
                totalHours: r2(active.reduce((s, r) => s + (Number(r.hoursWorked) || 0), 0)),
                holidayHours: r2(active.filter((r) => r.isHoliday).reduce((s, r) => s + (Number(r.hoursWorked) || 0), 0)),
                avgHoursPerDay: active.length ? r2(active.reduce((s, r) => s + (Number(r.hoursWorked) || 0), 0) / active.length) : 0,
            },
            rows,
        };
    }
    // ── Staff attendance ───────────────────────────────────────────────
    static async staffAttendanceReport(q) {
        const match = {};
        if (q.month)
            match.periodKey = q.month;
        if (q.employeeId && mongoose_1.default.isValidObjectId(q.employeeId))
            match.employeeId = new mongoose_1.default.Types.ObjectId(q.employeeId);
        if (q.status)
            match.status = q.status;
        const empMatch = {};
        if (q.department)
            empMatch.department = { $regex: escapeRegex(q.department), $options: 'i' };
        const rows = await StaffAttendance_1.StaffAttendance.aggregate([
            { $match: match },
            { $sort: { date: -1 } },
            { $limit: Math.min(q.limit || 500, 2000) },
            { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'e', pipeline: Object.keys(empMatch).length ? [{ $match: empMatch }] : [] } },
            // department filter: keep only rows whose employee matched the department
            ...(q.department ? [{ $match: { 'e.0': { $exists: true } } }] : []),
            {
                $project: {
                    _id: 0, date: 1, status: 1, leaveType: 1, notes: 1, source: 1,
                    employeeCode: { $arrayElemAt: ['$e.employeeCode', 0] },
                    employeeName: {
                        $trim: {
                            input: {
                                $concat: [
                                    { $arrayElemAt: ['$e.firstName', 0] }, ' ',
                                    { $ifNull: [{ $arrayElemAt: ['$e.middleName', 0] }, ''] }, ' ',
                                    { $arrayElemAt: ['$e.lastName', 0] },
                                ],
                            },
                        },
                    },
                    department: { $arrayElemAt: ['$e.department', 0] },
                },
            },
            { $sort: { date: -1 } },
        ]);
        const byStatus = {};
        for (const r of rows)
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        return {
            report: 'STAFF_ATTENDANCE',
            generatedAt: new Date(),
            filters: q,
            summary: { records: rows.length, byStatus },
            rows,
        };
    }
    // ── Payroll (guard or staff) ───────────────────────────────────────
    static async payrollReport(q) {
        const isGuard = (q.module || 'GUARD') !== 'STAFF';
        const match = {};
        if (q.periodKey)
            match.periodKey = q.periodKey;
        const runCollection = isGuard ? 'guardpayrollruns' : 'staffpayrollruns';
        const runMatch = {};
        if (q.runStatus)
            runMatch.status = q.runStatus;
        const searchPost = q.search
            ? [{
                    $match: {
                        $or: [
                            { employeeCode: { $regex: escapeRegex(q.search), $options: 'i' } },
                            { employeeName: { $regex: escapeRegex(q.search), $options: 'i' } },
                        ],
                    },
                }]
            : [];
        const rows = await (isGuard ? GuardPayrollRecord_1.GuardPayrollRecord : StaffPayrollRecord_1.StaffPayrollRecord).aggregate([
            { $match: match },
            {
                $lookup: {
                    from: runCollection,
                    let: { rid: '$runId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$rid'] }, ...runMatch } },
                        { $project: { periodKey: 1, status: 1, paidAt: 1, paymentRef: 1 } },
                    ],
                    as: 'run',
                },
            },
            { $match: { 'run.0': { $exists: true } } },
            { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'e' } },
            ...(isGuard
                ? [{
                        $lookup: {
                            from: 'primarysiteassignments',
                            let: { eid: '$employeeId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$guardId', '$$eid'] }, isPrimary: true, isCurrent: true } },
                                { $sort: { effectiveFrom: -1 } },
                                { $limit: 1 },
                            ],
                            as: 'assign',
                        },
                    },
                    { $lookup: { from: 'sites', localField: 'assign.siteId', foreignField: '_id', as: 'site' } }]
                : []),
            {
                $addFields: {
                    runStatus: { $arrayElemAt: ['$run.status', 0] },
                    runPaidAt: { $arrayElemAt: ['$run.paidAt', 0] },
                    runPaymentRef: { $arrayElemAt: ['$run.paymentRef', 0] },
                    employeeCode: { $arrayElemAt: ['$e.employeeCode', 0] },
                    employeeName: {
                        $trim: {
                            input: {
                                $concat: [
                                    { $arrayElemAt: ['$e.firstName', 0] }, ' ',
                                    { $ifNull: [{ $arrayElemAt: ['$e.middleName', 0] }, ''] }, ' ',
                                    { $arrayElemAt: ['$e.lastName', 0] },
                                ],
                            },
                        },
                    },
                    siteName: isGuard ? { $arrayElemAt: ['$site.siteName', 0] } : { $arrayElemAt: ['$snapshot.department', 0] },
                },
            },
            ...searchPost,
            { $sort: { employeeCode: 1, periodKey: -1 } },
            {
                $project: {
                    _id: 0, periodKey: 1, runStatus: 1, runPaidAt: 1, runPaymentRef: 1,
                    employeeCode: 1, employeeName: 1, siteName: 1,
                    ...(isGuard
                        ? {
                            grossEarnings: 1, pensionBase: 1, employeePension: 1, employerPension: 1,
                            taxableEarnings: 1, incomeTax: 1, totalDeductions: 1, netPay: 1,
                        }
                        : {
                            grossEarnings: 1, taxableEarnings: 1, employeePension: 1, employerPension: 1,
                            incomeTax: 1, totalDeductions: 1, netPay: 1, bonus: 1, finalAmountPaid: 1,
                        }),
                },
            },
        ]);
        const sum = (k) => r2(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));
        const byStatus = {};
        for (const r of rows)
            byStatus[r.runStatus] = (byStatus[r.runStatus] || 0) + 1;
        const summary = {
            module: isGuard ? 'GUARD' : 'STAFF',
            records: rows.length,
            periods: [...new Set(rows.map((r) => r.periodKey))].sort(),
            byRunStatus: byStatus,
            totalGross: sum('grossEarnings'),
            totalEmployeePension: sum('employeePension'),
            totalEmployerPension: sum('employerPension'),
            totalIncomeTax: sum('incomeTax'),
            totalDeductions: sum('totalDeductions'),
            totalNet: sum('netPay'),
            ...(isGuard ? {} : { totalBonus: sum('bonus'), totalFinalPaid: sum('finalAmountPaid') }),
        };
        return { report: isGuard ? 'PAYROLL_GUARD' : 'PAYROLL_STAFF', generatedAt: new Date(), filters: q, summary, rows };
    }
    // ── Audit trail ────────────────────────────────────────────────────
    static async auditReport(q) {
        const match = {};
        if (q.action)
            match.action = { $regex: escapeRegex(q.action), $options: 'i' };
        if (q.entity)
            match.entity = q.entity;
        if (q.userId && mongoose_1.default.isValidObjectId(q.userId))
            match.userId = new mongoose_1.default.Types.ObjectId(q.userId);
        if (q.from || q.to) {
            match.createdAt = {
                ...(q.from ? { $gte: new Date(q.from) } : {}),
                ...(q.to ? { $lte: new Date(`${q.to}T23:59:59.999Z`) } : {}),
            };
        }
        const limit = Math.min(q.limit || 300, 1000);
        const [rows, topActions] = await Promise.all([
            AuditLog_1.AuditLog.aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                { $limit: limit },
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } },
                {
                    $project: {
                        _id: 0, createdAt: 1, action: 1, entity: 1, entityId: 1, reason: 1, ipAddress: 1,
                        userName: {
                            $trim: {
                                input: {
                                    $concat: [
                                        { $arrayElemAt: ['$u.firstName', 0] }, ' ',
                                        { $arrayElemAt: ['$u.lastName', 0] },
                                    ],
                                },
                            },
                        },
                        userEmail: { $arrayElemAt: ['$u.email', 0] },
                    },
                },
            ]),
            AuditLog_1.AuditLog.aggregate([
                { $match: match },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
        ]);
        return {
            report: 'AUDIT',
            generatedAt: new Date(),
            filters: q,
            summary: {
                shown: rows.length,
                limit,
                topActions: topActions.map((t) => ({ action: t._id, count: t.count })),
            },
            rows,
        };
    }
    // ── Users (administration) ─────────────────────────────────────────
    static async usersReport(q) {
        const match = {};
        if (q.role)
            match.role = q.role;
        if (q.isActive === 'true')
            match.isActive = true;
        if (q.isActive === 'false')
            match.isActive = false;
        if (q.search) {
            const rx = { $regex: escapeRegex(q.search), $options: 'i' };
            match.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
        }
        const rows = await User_1.User.find(match)
            .sort({ role: 1, email: 1 })
            .select('firstName lastName email role isActive lastLogin createdAt')
            .lean();
        const byRole = {};
        for (const r of rows)
            byRole[r.role] = (byRole[r.role] || 0) + 1;
        return {
            report: 'USERS',
            generatedAt: new Date(),
            filters: q,
            summary: { total: rows.length, active: rows.filter((r) => r.isActive).length, byRole },
            rows: rows.map((r) => ({
                email: r.email,
                fullName: `${r.firstName} ${r.lastName}`.trim(),
                role: r.role,
                isActive: r.isActive,
                lastLogin: r.lastLogin,
                createdAt: r.createdAt,
            })),
        };
    }
}
exports.ModuleReportsService = ModuleReportsService;
//# sourceMappingURL=reports2.service.js.map