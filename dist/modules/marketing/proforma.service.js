"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProformaService = void 0;
exports.buildShiftNote = buildShiftNote;
const mongoose_1 = require("mongoose");
const Proforma_1 = require("../../models/Proforma");
const ProformaSequence_1 = require("../../models/ProformaSequence");
const ProformaCompany_1 = require("../../models/ProformaCompany");
const ProformaSite_1 = require("../../models/ProformaSite");
const ServiceRole_1 = require("../../models/ServiceRole");
const types_1 = require("../../types");
const ApiError_1 = require("../../common/ApiError");
const AuditLog_1 = require("../../models/AuditLog");
const MAX_ITEMS = 50;
function text(value, label, max = 300) {
    if (value === undefined || value === null)
        return '';
    const s = String(value).trim();
    if (s.length > max)
        throw ApiError_1.ApiError.badRequest(`${label} must be at most ${max} characters`);
    return s;
}
function requiredId(value, label) {
    const s = text(value, label, 64);
    if (!s)
        throw ApiError_1.ApiError.badRequest(`${label} is required`);
    if (!mongoose_1.Types.ObjectId.isValid(s))
        throw ApiError_1.ApiError.badRequest(`${label} must be a valid id`);
    return s;
}
/** Local-midnight calendar date (avoids UTC off-by-one on issue/validity dates). */
function toCalendarDate(value, label) {
    if (value === undefined || value === null || value === '') {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime()))
        throw ApiError_1.ApiError.badRequest(`${label} must be a valid date`);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function normalizeValidityDays(value) {
    if (value === undefined || value === null || value === '')
        return Proforma_1.PROFORMA_DEFAULT_VALIDITY_DAYS;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
        throw ApiError_1.ApiError.badRequest('validityDays must be a whole number between 1 and 365');
    }
    return n;
}
/** Read-only totals recomputation safety: always derive from the items. */
function totalsOf(items) {
    return (0, Proforma_1.computeProformaTotals)(items, Proforma_1.PROFORMA_VAT_RATE);
}
/** Auto-generated shift note (Step 3 of the issuing page), editable afterwards. */
function buildShiftNote(items) {
    const isManpower = (it) => !it.category || it.category === ServiceRole_1.RoleCategory.MANPOWER;
    const rows = items.map((it) => {
        if (!isManpower(it)) {
            // Technology / specialised services are supplied as units, not posts.
            return `${it.roleName} — ${Number(it.totalHeadcount.toFixed(2))} unit${it.totalHeadcount === 1 ? '' : 's'} per month.`;
        }
        const pattern = (0, ServiceRole_1.describeShiftPattern)(it.shiftPattern);
        const rest = it.restDaysRule ? ` ${it.restDaysRule}` : '';
        return `${it.roleName} — ${it.postsPerDay} post${it.postsPerDay === 1 ? '' : 's'} per day; ${pattern}.${rest}`;
    });
    const headcount = items.reduce((s, i) => s + (isManpower(i) ? i.totalHeadcount : 0), 0);
    return [
        ...rows,
        `Total headcount: ${Number(headcount.toFixed(2))} guard(s)/staff per month (posts per day × role multiplier).`,
        'Rates quoted are monthly and exclusive of VAT where VAT applies.',
    ].join('\n');
}
class ProformaService {
    static async getAll(options) {
        const page = options.page && options.page > 0 ? options.page : 1;
        const limit = options.limit ? Math.min(options.limit, 100) : 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (options.status && options.status !== 'ALL') {
            if (!Object.values(Proforma_1.ProformaStatus).includes(options.status)) {
                throw ApiError_1.ApiError.badRequest(`status must be one of: ${Object.values(Proforma_1.ProformaStatus).join(', ')}, ALL`);
            }
            filter.status = options.status;
        }
        if (options.companyId) {
            if (!mongoose_1.Types.ObjectId.isValid(options.companyId))
                throw ApiError_1.ApiError.badRequest('companyId must be a valid company id');
            filter.companyId = new mongoose_1.Types.ObjectId(options.companyId);
        }
        if (options.from || options.to) {
            filter.issueDate = {};
            if (options.from) {
                const from = new Date(options.from);
                if (Number.isNaN(from.getTime()))
                    throw ApiError_1.ApiError.badRequest('from must be a valid date');
                filter.issueDate.$gte = from;
            }
            if (options.to) {
                const to = new Date(options.to);
                if (Number.isNaN(to.getTime()))
                    throw ApiError_1.ApiError.badRequest('to must be a valid date');
                filter.issueDate.$lte = to;
            }
        }
        if (options.search) {
            const rx = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ number: rx }, { 'items.roleName': rx }, { notes: rx }];
        }
        const [docs, total] = await Promise.all([
            Proforma_1.Proforma.find(filter)
                .populate('companyId', 'name nameAm tin city primaryPhone primaryEmail status')
                .populate('siteId', 'siteName city address status')
                .sort({ issueDate: -1, number: -1 })
                .skip(skip)
                .limit(limit),
            Proforma_1.Proforma.countDocuments(filter),
        ]);
        return { data: docs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
    }
    static async getById(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            throw ApiError_1.ApiError.badRequest('Invalid proforma id');
        const proforma = await Proforma_1.Proforma.findById(id)
            .populate('companyId', 'name nameAm tin registrationNumber companyType industry address city region country primaryPhone secondaryPhone primaryEmail website status contacts')
            .populate('siteId', 'siteName address city region specialRequirements status');
        if (!proforma)
            throw ApiError_1.ApiError.notFound('Proforma not found');
        return proforma;
    }
    /**
     * Validate + price the submitted lines. Headcount and line totals are always
     * recomputed here (rule 3): any client-supplied totalHeadcount/lineTotal is
     * ignored, and the rate may only differ from the catalog default when the
     * role allows overrides.
     */
    static async resolveItems(rawItems) {
        if (!Array.isArray(rawItems) || rawItems.length === 0) {
            throw ApiError_1.ApiError.badRequest('A proforma must quote at least one service line (items is required)');
        }
        if (rawItems.length > MAX_ITEMS) {
            throw ApiError_1.ApiError.badRequest(`A proforma may quote at most ${MAX_ITEMS} lines`);
        }
        const ids = rawItems.map((row, i) => requiredId(row?.roleId, `items[${i}].roleId`));
        const roles = await ServiceRole_1.ServiceRole.find({ _id: { $in: ids } });
        const byId = new Map(roles.map((r) => [String(r._id), r]));
        return rawItems.map((row, i) => {
            const role = byId.get(String(row.roleId));
            if (!role)
                throw ApiError_1.ApiError.badRequest(`items[${i}] references an unknown service role`);
            if (role.status !== types_1.CompanyStatus.ACTIVE) {
                throw ApiError_1.ApiError.badRequest(`items[${i}] references an inactive service role (${role.roleCode})`);
            }
            const postsPerDay = Number(row.postsPerDay);
            if (!Number.isInteger(postsPerDay) || postsPerDay < 1 || postsPerDay > 1000) {
                throw ApiError_1.ApiError.badRequest(`items[${i}].postsPerDay must be a whole number between 1 and 1000`);
            }
            if (!(role.multiplier > 0)) {
                throw ApiError_1.ApiError.badRequest(`Service role ${role.roleCode} has no valid multiplier`);
            }
            let unitRate = role.defaultMonthlyRate;
            if (row.unitRate !== undefined && row.unitRate !== null && row.unitRate !== '') {
                const requested = Number(row.unitRate);
                if (!Number.isFinite(requested) || requested < 0) {
                    throw ApiError_1.ApiError.badRequest(`items[${i}].unitRate must be a non-negative number`);
                }
                if (requested !== role.defaultMonthlyRate) {
                    if (!role.allowRateOverride) {
                        throw ApiError_1.ApiError.badRequest(`items[${i}]: the rate for ${role.roleCode} is fixed at ${role.defaultMonthlyRate} (overrides are disabled on this role)`);
                    }
                    unitRate = requested;
                }
            }
            const { totalHeadcount, lineTotal } = (0, Proforma_1.computeItemValues)(postsPerDay, role.multiplier, unitRate);
            return {
                roleId: role._id,
                roleCode: role.roleCode,
                roleName: role.roleName,
                gender: role.gender,
                category: role.category,
                postsPerDay,
                multiplier: role.multiplier,
                totalHeadcount,
                unitRate,
                lineTotal,
                vatApplicable: role.vatApplicable,
                shiftPattern: role.shiftPattern,
                restDaysRule: role.restDaysRule ?? '',
            };
        });
    }
    /** Rules 1 + site ownership: only an ACTIVE company and its ACTIVE site. */
    static async resolveRecipient(companyIdRaw, siteIdRaw) {
        const companyId = requiredId(companyIdRaw, 'companyId');
        const siteId = requiredId(siteIdRaw, 'siteId');
        const company = await ProformaCompany_1.ProformaCompany.findById(companyId);
        if (!company)
            throw ApiError_1.ApiError.badRequest('The selected company is not registered');
        if (company.status !== types_1.CompanyStatus.ACTIVE) {
            throw ApiError_1.ApiError.badRequest('A proforma can only be created for an active company');
        }
        const site = await ProformaSite_1.ProformaSite.findById(siteId);
        if (!site)
            throw ApiError_1.ApiError.badRequest('The selected site does not exist');
        if (String(site.companyId) !== String(company._id)) {
            throw ApiError_1.ApiError.badRequest('The selected site does not belong to the selected company');
        }
        if (site.status !== types_1.CompanyStatus.ACTIVE) {
            throw ApiError_1.ApiError.badRequest('The selected site is inactive');
        }
        return { company, site };
    }
    static async create(input, ctx) {
        const { company, site } = await ProformaService.resolveRecipient(input.companyId, input.siteId);
        const items = await ProformaService.resolveItems(input.items);
        const validityDays = normalizeValidityDays(input.validityDays);
        const issueDate = toCalendarDate(input.issueDate, 'issueDate');
        const shiftNote = text(input.shiftNote, 'Shift note', 4000) || buildShiftNote(items);
        const notes = text(input.notes, 'Notes', 4000);
        const internalNotes = text(input.internalNotes, 'Internal notes', 4000);
        const totals = totalsOf(items);
        const proforma = await Proforma_1.Proforma.create({
            number: await ProformaService.nextNumber(),
            companyId: company._id,
            siteId: site._id,
            issueDate,
            validityDays,
            validityDate: (0, Proforma_1.addDays)(issueDate, validityDays),
            status: Proforma_1.ProformaStatus.DRAFT,
            items,
            ...totals,
            shiftNote,
            notes,
            internalNotes,
            deliveryEmailPdf: input.deliveryEmailPdf === true || input.deliveryEmailPdf === 'true',
            deliveryHardCopy: input.deliveryHardCopy === true || input.deliveryHardCopy === 'true',
            createdBy: (ctx.userId ?? null),
            updatedBy: (ctx.userId ?? null),
        });
        await ProformaService.audit(ctx, 'PROFORMA_CREATE', proforma, { number: proforma.number });
        return proforma;
    }
    /** Rule 4: once issued the document is frozen — only DRAFTs can be edited. */
    static async update(id, input, ctx) {
        const proforma = await Proforma_1.Proforma.findById(id);
        if (!proforma)
            throw ApiError_1.ApiError.notFound('Proforma not found');
        if (proforma.status !== Proforma_1.ProformaStatus.DRAFT) {
            throw ApiError_1.ApiError.forbidden(`Only DRAFT proformas can be edited (current status: ${proforma.status})`);
        }
        const oldValues = proforma.toObject();
        if (input.companyId !== undefined || input.siteId !== undefined) {
            const { company, site } = await ProformaService.resolveRecipient(input.companyId ?? proforma.companyId, input.siteId ?? proforma.siteId);
            proforma.companyId = company._id;
            proforma.siteId = site._id;
        }
        if (input.items !== undefined) {
            proforma.items = (await ProformaService.resolveItems(input.items));
            Object.assign(proforma, totalsOf(proforma.items));
            if (input.shiftNote === undefined)
                proforma.shiftNote = buildShiftNote(proforma.items);
        }
        if (input.validityDays !== undefined) {
            proforma.validityDays = normalizeValidityDays(input.validityDays);
            proforma.validityDate = (0, Proforma_1.addDays)(proforma.issueDate, proforma.validityDays);
        }
        if (input.issueDate !== undefined) {
            proforma.issueDate = toCalendarDate(input.issueDate, 'issueDate');
            proforma.validityDate = (0, Proforma_1.addDays)(proforma.issueDate, proforma.validityDays);
        }
        if (input.shiftNote !== undefined)
            proforma.shiftNote = text(input.shiftNote, 'Shift note', 4000);
        if (input.notes !== undefined)
            proforma.notes = text(input.notes, 'Notes', 4000);
        if (input.internalNotes !== undefined)
            proforma.internalNotes = text(input.internalNotes, 'Internal notes', 4000);
        if (input.deliveryEmailPdf !== undefined) {
            proforma.deliveryEmailPdf = input.deliveryEmailPdf === true || input.deliveryEmailPdf === 'true';
        }
        if (input.deliveryHardCopy !== undefined) {
            proforma.deliveryHardCopy = input.deliveryHardCopy === true || input.deliveryHardCopy === 'true';
        }
        proforma.updatedBy = (ctx.userId ?? null);
        await proforma.save();
        await ProformaService.audit(ctx, 'PROFORMA_UPDATE', proforma, oldValues);
        return proforma;
    }
    static async issue(id, ctx) {
        const proforma = await Proforma_1.Proforma.findById(id);
        if (!proforma)
            throw ApiError_1.ApiError.notFound('Proforma not found');
        if (proforma.status !== Proforma_1.ProformaStatus.DRAFT) {
            throw ApiError_1.ApiError.badRequest(`Only a DRAFT proforma can be issued (current status: ${proforma.status})`);
        }
        // Re-check the commercial preconditions at issue time: companies/sites/roles
        // may have been deactivated while the draft was being prepared.
        await ProformaService.resolveRecipient(proforma.companyId, proforma.siteId);
        proforma.status = Proforma_1.ProformaStatus.ISSUED;
        proforma.issuedAt = new Date();
        proforma.issuedBy = (ctx.userId ?? null);
        await proforma.save();
        await ProformaService.audit(ctx, 'PROFORMA_ISSUE', proforma, { status: Proforma_1.ProformaStatus.DRAFT });
        return proforma;
    }
    /** Lifecycle move (accept / expire / convert / cancel) per the transition map. */
    static async setStatus(id, nextStatusRaw, ctx) {
        const next = String(nextStatusRaw ?? '').toUpperCase();
        if (!Object.values(Proforma_1.ProformaStatus).includes(next)) {
            throw ApiError_1.ApiError.badRequest(`status must be one of: ${Object.values(Proforma_1.ProformaStatus).join(', ')}`);
        }
        const proforma = await Proforma_1.Proforma.findById(id);
        if (!proforma)
            throw ApiError_1.ApiError.notFound('Proforma not found');
        const allowed = Proforma_1.PROFORMA_TRANSITIONS[proforma.status] ?? [];
        if (!allowed.includes(next)) {
            throw ApiError_1.ApiError.badRequest(`A ${proforma.status} proforma cannot move to ${next} (allowed: ${allowed.join(', ') || 'none'})`);
        }
        const oldStatus = proforma.status;
        proforma.status = next;
        if (next === Proforma_1.ProformaStatus.CANCELLED)
            proforma.cancelledAt = new Date();
        await proforma.save();
        await ProformaService.audit(ctx, `PROFORMA_${next}`, proforma, { status: oldStatus });
        return proforma;
    }
    /**
     * Atomic per-year allocation: 'PF/VGT/<YEAR>/<NNNN>'. Numbers are never
     * reused, even when a draft is cancelled (rule 7).
     */
    static async nextNumber() {
        const year = new Date().getFullYear();
        const counter = await ProformaSequence_1.ProformaSequence.findOneAndUpdate({ key: `PROFORMA-VGT-${year}` }, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        return `PF/VGT/${year}/${String(counter.seq).padStart(4, '0')}`;
    }
    static async audit(ctx, action, doc, oldValues) {
        if (!ctx.userId || !doc)
            return;
        await AuditLog_1.AuditLog.create({
            userId: ctx.userId,
            action,
            entity: 'Proforma',
            entityId: doc._id,
            oldValues: oldValues ?? undefined,
            newValues: doc.toObject(),
            ipAddress: ctx.ip,
            userAgent: ctx.ua,
        });
    }
}
exports.ProformaService = ProformaService;
//# sourceMappingURL=proforma.service.js.map