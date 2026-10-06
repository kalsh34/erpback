"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const PayrollRate_1 = require("../../../models/PayrollRate");
const GuardSiteRate_1 = require("../../../models/GuardSiteRate");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class FinanceService {
    static async setPayrollRates(payrollPeriodId, data, userId, auditCtx) {
        const existing = await PayrollRate_1.PayrollRate.findOne({ payrollPeriodId });
        if (existing) {
            const oldRates = { normalRate: existing.normalRate, otRate: existing.otRate, holidayRate: existing.holidayRate };
            existing.normalRate = data.normalRate;
            existing.otRate = data.otRate;
            existing.holidayRate = data.holidayRate;
            existing.setBy = userId;
            await existing.save();
            AuditService_1.AuditService.log({
                userId,
                action: 'PAYROLL_RATES_UPDATE',
                entity: 'PayrollRate',
                entityId: existing._id.toString(),
                oldValues: oldRates,
                newValues: data,
                ipAddress: auditCtx?.ip,
                userAgent: auditCtx?.ua,
            });
            EventBus_1.eventBus.emit('hr.payroll.ratesUpdated', { payrollPeriodId, ...data });
            return existing;
        }
        const rate = await PayrollRate_1.PayrollRate.create({ payrollPeriodId, ...data, setBy: userId });
        AuditService_1.AuditService.log({
            userId,
            action: 'PAYROLL_RATES_CREATE',
            entity: 'PayrollRate',
            entityId: rate._id.toString(),
            newValues: data,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.payroll.ratesCreated', { payrollPeriodId, ...data });
        return rate;
    }
    static async getPayrollRates(payrollPeriodId) {
        return PayrollRate_1.PayrollRate.findOne({ payrollPeriodId });
    }
    // ── Per Guard + Site + Period rates for additional sites (spec §3) ──
    static async getSiteRates(payrollPeriodId) {
        return GuardSiteRate_1.GuardSiteRate.find({ payrollPeriodId })
            .populate('guardId', 'firstName lastName employeeCode')
            .populate('siteId', 'siteName siteCode')
            .sort({ createdAt: -1 });
    }
    static async upsertSiteRates(payrollPeriodId, entries, userId, auditCtx) {
        if (!Array.isArray(entries) || entries.length === 0) {
            throw ApiError_1.ApiError.badRequest('No rates provided.');
        }
        const results = [];
        for (const entry of entries) {
            if (!entry.guardId || !entry.siteId)
                throw ApiError_1.ApiError.badRequest('Each rate needs guardId and siteId.');
            if (typeof entry.normalRate !== 'number' || !Number.isFinite(entry.normalRate) || entry.normalRate < 0) {
                throw ApiError_1.ApiError.badRequest('normalRate must be a non-negative number.');
            }
            if (typeof entry.holidayRate !== 'number' || !Number.isFinite(entry.holidayRate) || entry.holidayRate < 0) {
                throw ApiError_1.ApiError.badRequest('holidayRate must be a non-negative number.');
            }
            const existing = await GuardSiteRate_1.GuardSiteRate.findOne({
                guardId: entry.guardId,
                siteId: entry.siteId,
                payrollPeriodId,
            });
            if (existing) {
                const oldValues = { normalRate: existing.normalRate, holidayRate: existing.holidayRate };
                existing.normalRate = entry.normalRate;
                existing.holidayRate = entry.holidayRate;
                existing.setBy = userId;
                await existing.save();
                AuditService_1.AuditService.log({
                    userId,
                    action: 'PAYROLL_SITE_RATE_UPDATE',
                    entity: 'GuardSiteRate',
                    entityId: existing._id.toString(),
                    oldValues,
                    newValues: { normalRate: entry.normalRate, holidayRate: entry.holidayRate },
                    ipAddress: auditCtx?.ip,
                    userAgent: auditCtx?.ua,
                });
                results.push(existing);
            }
            else {
                const created = await GuardSiteRate_1.GuardSiteRate.create({
                    guardId: entry.guardId,
                    siteId: entry.siteId,
                    payrollPeriodId,
                    normalRate: entry.normalRate,
                    holidayRate: entry.holidayRate,
                    setBy: userId,
                });
                AuditService_1.AuditService.log({
                    userId,
                    action: 'PAYROLL_SITE_RATE_CREATE',
                    entity: 'GuardSiteRate',
                    entityId: created._id.toString(),
                    newValues: { guardId: entry.guardId, siteId: entry.siteId, normalRate: entry.normalRate, holidayRate: entry.holidayRate },
                    ipAddress: auditCtx?.ip,
                    userAgent: auditCtx?.ua,
                });
                results.push(created);
            }
        }
        EventBus_1.eventBus.emit('hr.payroll.siteRatesSaved', { payrollPeriodId, count: results.length });
        return results;
    }
    static async deleteSiteRate(id, userId, auditCtx) {
        const rate = await GuardSiteRate_1.GuardSiteRate.findById(id);
        if (!rate)
            throw ApiError_1.ApiError.notFound('Site rate not found');
        await GuardSiteRate_1.GuardSiteRate.deleteOne({ _id: rate._id });
        AuditService_1.AuditService.log({
            userId,
            action: 'PAYROLL_SITE_RATE_DELETE',
            entity: 'GuardSiteRate',
            entityId: id,
            oldValues: {
                guardId: String(rate.guardId),
                siteId: String(rate.siteId),
                normalRate: rate.normalRate,
                holidayRate: rate.holidayRate,
            },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.payroll.siteRateDeleted', { id });
        return { id };
    }
}
exports.FinanceService = FinanceService;
//# sourceMappingURL=finance.service.js.map