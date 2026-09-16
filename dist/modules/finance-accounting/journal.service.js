"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalService = void 0;
const JournalEntry_1 = require("../../models/JournalEntry");
const ApiError_1 = require("../../common/ApiError");
const AuditService_1 = require("../../core/audit/AuditService");
let entryCounter = 0;
let counterSeededForPrefix = '';
// The counter is in-memory, so a server restart used to reset it to zero and
// the next journal entries collided with existing entryNumbers (E11000), which
// broke every confirm-paid until the counter happened to pass the old maximum.
// Seed it once per process (per YYYYMM prefix) from the highest persisted
// sequence so newly generated numbers always continue the series.
async function generateEntryNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `JE-${y}${m}`;
    if (counterSeededForPrefix !== prefix) {
        const latest = await JournalEntry_1.JournalEntry.findOne({ entryNumber: new RegExp(`^${prefix}-`) })
            .sort({ entryNumber: -1 })
            .lean();
        const match = latest?.entryNumber ? /-(\d+)$/.exec(latest.entryNumber) : null;
        entryCounter = match ? parseInt(match[1], 10) : 0;
        counterSeededForPrefix = prefix;
    }
    entryCounter++;
    const seq = String(entryCounter).padStart(4, '0');
    return `${prefix}-${seq}`;
}
class JournalService {
    static async createEntry(data) {
        const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw ApiError_1.ApiError.badRequest(`Debit total (${totalDebit}) must equal credit total (${totalCredit})`);
        }
        if (data.lines.length < 2) {
            throw ApiError_1.ApiError.badRequest('Journal entry must have at least 2 lines');
        }
        const entry = await JournalEntry_1.JournalEntry.create({
            entryNumber: await generateEntryNumber(),
            entryDate: new Date(),
            entryType: data.entryType,
            status: 'POSTED',
            description: data.description,
            reference: data.reference,
            referenceModel: data.referenceModel,
            referenceId: data.referenceId,
            lines: data.lines,
            totalDebit: Math.round(totalDebit * 100) / 100,
            totalCredit: Math.round(totalCredit * 100) / 100,
            postedBy: data.userId,
            postedAt: new Date(),
            payrollPeriodId: data.payrollPeriodId,
        });
        if (data.userId) {
            AuditService_1.AuditService.log({
                userId: data.userId,
                action: 'JOURNAL_ENTRY_CREATE',
                entity: 'JournalEntry',
                entityId: entry._id.toString(),
                newValues: { entryNumber: entry.entryNumber, totalDebit: entry.totalDebit, description: data.description },
                ipAddress: data.ip,
                userAgent: data.ua,
            });
        }
        return entry;
    }
    static async voidEntry(entryId, reason, userId, auditCtx) {
        const entry = await JournalEntry_1.JournalEntry.findById(entryId);
        if (!entry)
            throw ApiError_1.ApiError.notFound('Journal entry not found');
        if (entry.status === 'VOID')
            throw ApiError_1.ApiError.badRequest('Entry is already voided');
        entry.status = 'VOID';
        entry.voidedBy = userId;
        entry.voidedAt = new Date();
        entry.voidReason = reason;
        await entry.save();
        AuditService_1.AuditService.log({
            userId,
            action: 'JOURNAL_ENTRY_VOID',
            entity: 'JournalEntry',
            entityId: entryId,
            newValues: { reason, entryNumber: entry.entryNumber },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        return entry;
    }
    static async getAll(query) {
        const { entryType, status, accountCode, startDate, endDate, payrollPeriodId, page = 1, limit = 50 } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (entryType)
            filter.entryType = entryType;
        if (status)
            filter.status = status;
        if (payrollPeriodId)
            filter.payrollPeriodId = payrollPeriodId;
        if (accountCode)
            filter['lines.accountCode'] = accountCode;
        if (startDate || endDate) {
            filter.entryDate = {};
            if (startDate)
                filter.entryDate.$gte = new Date(startDate);
            if (endDate)
                filter.entryDate.$lte = new Date(endDate);
        }
        const [entries, total] = await Promise.all([
            JournalEntry_1.JournalEntry.find(filter)
                .sort({ entryDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            JournalEntry_1.JournalEntry.countDocuments(filter),
        ]);
        return { data: entries, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const entry = await JournalEntry_1.JournalEntry.findById(id);
        if (!entry)
            throw ApiError_1.ApiError.notFound('Journal entry not found');
        return entry;
    }
    static async getAccountSummary(query) {
        const match = { status: 'POSTED' };
        if (query.payrollPeriodId)
            match.payrollPeriodId = new (await Promise.resolve().then(() => __importStar(require('mongoose')))).default.Types.ObjectId(query.payrollPeriodId);
        if (query.startDate || query.endDate) {
            match.entryDate = {};
            if (query.startDate)
                match.entryDate.$gte = new Date(query.startDate);
            if (query.endDate)
                match.entryDate.$lte = new Date(query.endDate);
        }
        const result = await JournalEntry_1.JournalEntry.aggregate([
            { $match: match },
            { $unwind: '$lines' },
            {
                $group: {
                    _id: '$lines.accountCode',
                    accountName: { $first: '$lines.accountName' },
                    totalDebit: { $sum: '$lines.debit' },
                    totalCredit: { $sum: '$lines.credit' },
                    entryCount: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        return result.map((r) => ({
            accountCode: r._id,
            accountName: r.accountName,
            totalDebit: Math.round(r.totalDebit * 100) / 100,
            totalCredit: Math.round(r.totalCredit * 100) / 100,
            balance: Math.round((r.totalDebit - r.totalCredit) * 100) / 100,
            entryCount: r.entryCount,
        }));
    }
    static async getDashboardSummary() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [yearlyAgg, monthlyAgg, recentEntries] = await Promise.all([
            JournalEntry_1.JournalEntry.aggregate([
                { $match: { status: 'POSTED', entryDate: { $gte: startOfYear } } },
                { $unwind: '$lines' },
                {
                    $group: {
                        _id: '$lines.accountCode',
                        accountName: { $first: '$lines.accountName' },
                        totalDebit: { $sum: '$lines.debit' },
                        totalCredit: { $sum: '$lines.credit' },
                    },
                },
            ]),
            JournalEntry_1.JournalEntry.aggregate([
                { $match: { status: 'POSTED', entryDate: { $gte: startOfMonth } } },
                { $unwind: '$lines' },
                {
                    $group: {
                        _id: '$lines.accountCode',
                        accountName: { $first: '$lines.accountName' },
                        totalDebit: { $sum: '$lines.debit' },
                        totalCredit: { $sum: '$lines.credit' },
                    },
                },
            ]),
            JournalEntry_1.JournalEntry.find({ status: 'POSTED' })
                .sort({ entryDate: -1 })
                .limit(20),
        ]);
        const totalRevenue = yearlyAgg
            .filter((a) => a._id.startsWith('4') || a._id.startsWith('8'))
            .reduce((s, a) => s + a.totalCredit, 0);
        const totalExpenses = yearlyAgg
            .filter((a) => a._id.startsWith('5') || a._id.startsWith('6') || a._id.startsWith('7'))
            .reduce((s, a) => s + a.totalDebit, 0);
        const monthlyRevenue = monthlyAgg
            .filter((a) => a._id.startsWith('4') || a._id.startsWith('8'))
            .reduce((s, a) => s + a.totalCredit, 0);
        const monthlyExpenses = monthlyAgg
            .filter((a) => a._id.startsWith('5') || a._id.startsWith('6') || a._id.startsWith('7'))
            .reduce((s, a) => s + a.totalDebit, 0);
        const cashAccounts = yearlyAgg.filter((a) => a._id.startsWith('1'));
        const cashBalance = cashAccounts.reduce((s, a) => s + a.totalDebit - a.totalCredit, 0);
        return {
            totalRevenueYTD: Math.round(totalRevenue * 100) / 100,
            totalExpensesYTD: Math.round(totalExpenses * 100) / 100,
            netProfitYTD: Math.round((totalRevenue - totalExpenses) * 100) / 100,
            monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
            monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
            cashBalance: Math.round(cashBalance * 100) / 100,
            accountSummary: yearlyAgg.map((a) => ({
                accountCode: a._id,
                accountName: a.accountName,
                totalDebit: Math.round(a.totalDebit * 100) / 100,
                totalCredit: Math.round(a.totalCredit * 100) / 100,
            })),
            recentEntries,
        };
    }
}
exports.JournalService = JournalService;
//# sourceMappingURL=journal.service.js.map