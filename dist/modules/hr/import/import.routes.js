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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = require("../../../middleware/auth");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const excelImport_service_1 = require("./excelImport.service");
const mergeSheets_1 = require("./mergeSheets");
const cleaning_1 = require("./cleaning");
const Employee_1 = require("../../../models/Employee");
const Contract_1 = require("../../../models/Contract");
const Guarantor_1 = require("../../../models/Guarantor");
const Site_1 = require("../../../models/Site");
const employee_service_1 = require("../employees/employee.service");
const contract_service_1 = require("../contracts/contract.service");
const guarantor_service_1 = require("../guarantor/guarantor.service");
const AuditService_1 = require("../../../core/audit/AuditService");
/**
 * Excel import routes.
 *
 *  POST /excel     upload + parse + suggested mapping         (no writes)
 *  POST /preview   dry run: cleaned/merged people + DB dupes  (no writes)
 *  POST /commit    create Employee→Guarantor→Contract per person via services
 *
 * The commit re-runs the same cleaning and merging server-side — nothing is
 * trusted from the browser except the parsed sheets + mapping + options.
 */
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, fields: 3, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls')
            cb(null, true);
        else
            cb(new Error('Only .xlsx and .xls files are supported'));
    },
});
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const DEFAULT_OPTIONS = {
    ethiopianDates: false,
    defaultDepartment: '',
    defaultContractType: 'Full-Time',
    defaultPosition: 'Guard',
};
function sanitizeSheets(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .filter((s) => s && typeof s === 'object' && typeof s.name === 'string')
        .map((s) => ({
        name: String(s.name),
        columns: Array.isArray(s.columns) ? s.columns.map((c) => String(c)) : [],
        headerRow: typeof s.headerRow === 'number' ? s.headerRow : null,
        rows: Array.isArray(s.rows) ? s.rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : [])) : [],
    }));
}
function sanitizeOptions(raw) {
    const o = (raw || {});
    return {
        ethiopianDates: !!o.ethiopianDates,
        defaultDepartment: String(o.defaultDepartment || '').trim(),
        defaultContractType: String(o.defaultContractType || DEFAULT_OPTIONS.defaultContractType).trim() || DEFAULT_OPTIONS.defaultContractType,
        defaultPosition: String(o.defaultPosition || DEFAULT_OPTIONS.defaultPosition).trim() || DEFAULT_OPTIONS.defaultPosition,
    };
}
// ── POST /excel ─────────────────────────────────────────────────────────────
router.post('/excel', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_CREATE), upload.single('file'), (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file provided' });
            return;
        }
        const result = (0, excelImport_service_1.parseWorkbook)(req.file.buffer, req.file.originalname);
        res.json({ success: true, data: result });
    }
    catch (err) {
        if (err instanceof multer_1.default.MulterError) {
            res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'The file exceeds the 10 MB limit' : err.message });
            return;
        }
        res.status(400).json({ success: false, message: err?.message || 'The file could not be read as a workbook' });
    }
});
// ── POST /preview (dry run, no writes) ─────────────────────────────────────
router.post('/preview', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_CREATE), expressJsonOnly, async (req, res, next) => {
    try {
        const payload = (req.body || {});
        const sheets = sanitizeSheets(payload.sheets);
        const options = sanitizeOptions(payload.options);
        const mappingRaw = payload.mapping || {};
        const mapping = {};
        Object.entries(mappingRaw).forEach(([sheetName, m]) => {
            const norm = {};
            Object.entries(m || {}).forEach(([k, v]) => { if (typeof v === 'number' && v >= 0)
                norm[k] = v; });
            mapping[sheetName] = norm;
        });
        const merged = (0, mergeSheets_1.mergeSheets)(sheets, mapping, options);
        const report = await buildPreviewReport(merged);
        res.json({ success: true, data: report });
    }
    catch (err) {
        next(err);
    }
});
// ── POST /commit ───────────────────────────────────────────────────────────
router.post('/commit', (0, rbac_1.authorize)(types_1.PERMISSIONS.EMPLOYEE_CREATE), expressJsonOnly, async (req, res, next) => {
    const createdDocs = [];
    try {
        const payload = (req.body || {});
        const sheets = sanitizeSheets(payload.sheets);
        const options = sanitizeOptions(payload.options);
        const mappingRaw = payload.mapping || {};
        const mapping = {};
        Object.entries(mappingRaw).forEach(([sheetName, m]) => {
            const norm = {};
            Object.entries(m || {}).forEach(([k, v]) => { if (typeof v === 'number' && v >= 0)
                norm[k] = v; });
            mapping[sheetName] = norm;
        });
        const user = req.user;
        const auditCtx = { userId: String(user?._id || user?.userId || ''), ip: req.ip, ua: req.get('user-agent') };
        const merged = (0, mergeSheets_1.mergeSheets)(sheets, mapping, options);
        const usesTxn = await supportsTransactions();
        let session = null;
        if (usesTxn)
            session = await mongoose_1.default.startSession();
        const report = {
            created: { employees: 0, guarantors: 0, contracts: 0 },
            skippedDuplicates: [],
            failed: [],
            ambiguousRows: merged.ambiguous,
            warnings: merged.warnings.slice(0, 200),
            usedTransaction: usesTxn,
        };
        // Existing people for idempotency: normalised name + normalised phone.
        const existingEmployees = await Employee_1.Employee.find({}).lean();
        const existingByName = new Map();
        for (const e of existingEmployees) {
            const n = (0, cleaning_1.normalizeNameForMatch)([e.firstName, e.middleName, e.lastName].filter(Boolean).join(' '));
            const p = (e.phone || '').replace(/\D+/g, '');
            const keyFull = p ? `${n}::${p}` : n;
            const arr = existingByName.get(keyFull) || [];
            arr.push(e);
            existingByName.set(keyFull, arr);
            const arrName = existingByName.get(n) || [];
            arrName.push(e);
            existingByName.set(n, arrName);
        }
        // Site name → id, cached.
        const siteCache = new Map();
        const resolveSite = async (siteName) => {
            if (!siteName)
                return undefined;
            const normSite = (0, cleaning_1.normalizeNameForMatch)(siteName);
            if (siteCache.has(normSite))
                return siteCache.get(normSite);
            const site = await Site_1.Site.findOne({
                $or: [
                    { siteName: { $regex: escapeRegex(siteName), $options: 'i' } },
                    { siteCode: { $regex: escapeRegex(siteName), $options: 'i' } },
                ],
            }).lean();
            siteCache.set(normSite, site?._id || undefined);
            return site?._id || undefined;
        };
        const BATCH_SIZE = 100;
        let processed = 0;
        for (let batchStart = 0; batchStart < merged.people.length; batchStart += BATCH_SIZE) {
            const batch = merged.people.slice(batchStart, batchStart + BATCH_SIZE);
            for (const person of batch) {
                // Docs created FOR THIS PERSON only — on failure they are removed, so
                // one bad row can never wipe earlier successfully-committed people.
                const personDocs = [];
                try {
                    // Build the exact name the employee will store BEFORE the duplicate
                    // check, so the identity matches what later commits read back from
                    // the DB (a single-token name is duplicated into firstName+lastName).
                    const parts = splitName(person.name);
                    const storedName = [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(' ');
                    const { name: nName, phone: nPhone } = {
                        name: (0, cleaning_1.normalizeNameForMatch)(storedName),
                        phone: person.phone ? person.phone.replace(/\D+/g, '') : null,
                    };
                    const keyFull = nPhone ? `${nName}::${nPhone}` : nName;
                    const exact = existingByName.get(keyFull) || [];
                    if (exact.length > 0) {
                        report.skippedDuplicates.push({ name: person.name, phone: person.phone, reason: 'A person with the same normalised name and phone already exists' });
                        continue;
                    }
                    const nameOnly = existingByName.get(nName) || [];
                    if (!nPhone && nameOnly.length > 0) {
                        report.skippedDuplicates.push({ name: person.name, phone: person.phone, reason: 'A person with the same normalised name already exists (no phone to disambiguate)' });
                        continue;
                    }
                    const employeeData = {
                        employeeCode: await nextEmployeeCode(),
                        firstName: parts.firstName,
                        middleName: parts.middleName,
                        lastName: parts.lastName,
                        category: types_1.EmployeeCategory.GUARD,
                        status: types_1.EmployeeStatus.INACTIVE,
                        gender: person.gender === 'MALE' ? types_1.Gender.MALE : person.gender === 'FEMALE' ? types_1.Gender.FEMALE : undefined,
                        phone: person.phone || undefined,
                        hireDate: person.hireDate ? new Date(person.hireDate) : undefined,
                    };
                    if (/^\d{4}-\d{2}-\d{2}$/.test(String(person.hireDate || '')) === false)
                        delete employeeData.hireDate;
                    const homeSiteId = await resolveSite(person.siteName);
                    if (homeSiteId)
                        employeeData.homeSiteId = homeSiteId;
                    if (person.age != null && person.age > 0) {
                        employeeData.dateOfBirth = approximateBirthYear(person.age);
                    }
                    // Transaction per person when available; otherwise compensate.
                    if (session) {
                        session.startTransaction();
                    }
                    try {
                        const employee = await employee_service_1.EmployeeService.create(employeeData, auditCtx);
                        personDocs.push({ model: Employee_1.Employee, id: employee._id });
                        if (person.guarantor && (person.guarantor.name || person.guarantor.phone)) {
                            const guarantor = await guarantor_service_1.GuarantorService.create({
                                employeeId: employee._id,
                                guarantorType: 'PERSON',
                                fullName: person.guarantor.name || 'Unknown guarantor name',
                                phone: person.guarantor.phone || '—',
                                documents: [],
                            }, auditCtx);
                            personDocs.push({ model: Guarantor_1.Guarantor, id: guarantor._id });
                            report.created.guarantors += 1;
                        }
                        if (person.contract && person.contract.salary != null) {
                            // Contract start: the cleaned hire date when it IS a valid date;
                            // otherwise today. Never commit an Invalid Date.
                            const start = parseIsoOrNull(person.hireDate) || new Date();
                            const contract = await contract_service_1.ContractService.create({
                                employeeId: employee._id,
                                contractStartDate: start,
                                contractType: options.defaultContractType,
                                department: options.defaultDepartment || undefined,
                                jobPosition: options.defaultPosition,
                                wage: person.contract.salary ?? 0,
                                transportAllowance: person.contract.transportAllowance ?? 0,
                                nonTaxableAllowance: person.contract.totalPay ?? 0,
                            }, auditCtx);
                            personDocs.push({ model: Contract_1.Contract, id: contract._id });
                            report.created.contracts += 1;
                        }
                        // Marking a resigned import TERMINATED must not kill the person on
                        // its own activation rules — set it directly on the fresh record.
                        if (person.resigned) {
                            await Employee_1.Employee.updateOne({ _id: employee._id }, { $set: { status: types_1.EmployeeStatus.TERMINATED, terminationReason: 'Imported as resigned/exited guard', terminationDate: new Date() } });
                        }
                        if (session) {
                            await session.commitTransaction();
                        }
                        report.created.employees += 1;
                        // Track in-memory so duplicates later in the same file also skip.
                        existingByName.set(keyFull, [{ _id: employee._id }]);
                    }
                    catch (personErr) {
                        if (session) {
                            try {
                                await session.abortTransaction();
                            }
                            catch { /* already aborted */ }
                        }
                        // Compensate ONLY this person's docs (no transaction case).
                        for (const { model, id } of personDocs) {
                            await model.deleteOne({ _id: id }).catch(() => { });
                        }
                        report.failed.push({
                            sheet: person.sources[0]?.sheet || '?',
                            row: person.sources[0]?.row ?? -1,
                            name: person.name,
                            reason: personErr?.message || 'Unknown failure',
                        });
                    }
                }
                catch (rowErr) {
                    report.failed.push({
                        sheet: person?.sources?.[0]?.sheet || '?',
                        row: person?.sources?.[0]?.row ?? -1,
                        name: person?.name || '',
                        reason: rowErr?.message || 'Unknown failure',
                    });
                }
                processed += 1;
            }
        }
        if (session)
            session.endSession();
        await AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'IMPORT_COMMIT',
            entity: 'Employee',
            newValues: {
                fileName: payload.fileName || 'workbook.xlsx',
                created: report.created,
                skipped: report.skippedDuplicates.length,
                failed: report.failed.length,
            },
            reason: 'Excel import commit',
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        res.json({ success: true, data: report });
    }
    catch (err) {
        for (const { model, id } of createdDocs.splice(0)) {
            await model.deleteOne({ _id: id }).catch(() => { });
        }
        next(err);
    }
});
function expressJsonOnly(_req, _res, next) { next(); }
/** ISO yyyy-mm-dd or null (never an Invalid Date). */
function parseIsoOrNull(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return null;
    const d = new Date(value + 'T00:00:00.000Z');
    return Number.isNaN(d.getTime()) ? null : d;
}
function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function splitName(full) {
    const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return { firstName: '', lastName: '' };
    if (parts.length === 1)
        return { firstName: parts[0], lastName: parts[0] };
    if (parts.length === 2)
        return { firstName: parts[0], lastName: parts[1] };
    return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] };
}
function approximateBirthYear(age) {
    const y = new Date().getUTCFullYear() - Number(age);
    return new Date(Date.UTC(y, 0, 1));
}
/** Person → normalised name and digits-only phone for duplicate matching. */
function normalizeEmployeeIdentity(person) {
    const name = (0, cleaning_1.normalizeNameForMatch)(person.name);
    const phone = person.phone ? person.phone.replace(/\D+/g, '') : null;
    return { name, phone };
}
/** Sequential employee code VSP-<n> mirroring the guard registration logic. */
async function nextEmployeeCode() {
    const prefix = 'VSP';
    const Organization = (await Promise.resolve().then(() => __importStar(require('../../../core/organizations/Organization')))).Organization;
    const org = await Organization.findOneAndUpdate({ employeeCodePrefix: prefix }, { $inc: { nextEmployeeCode: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    return `${prefix}-${org.nextEmployeeCode}`;
}
async function supportsTransactions() {
    try {
        const hello = await mongoose_1.default.connection.db.admin().command({ hello: 1 });
        return !!hello.setName;
    }
    catch {
        return false;
    }
}
// ── Preview builder: same merged people, plus live-DB duplicates ───────────
async function buildPreviewReport(merged) {
    const existingEmployees = await Employee_1.Employee.find({}).lean();
    const existingKeys = new Set();
    const existingNameSet = new Set();
    for (const e of existingEmployees) {
        const n = (0, cleaning_1.normalizeNameForMatch)([e.firstName, e.middleName, e.lastName].filter(Boolean).join(' '));
        const p = (e.phone || '').replace(/\D+/g, '');
        if (p)
            existingKeys.add(`${n}::${p}`);
        existingNameSet.add(n);
    }
    let toCreate = 0;
    const duplicates = [];
    for (const person of merged.people) {
        const { name, phone } = normalizeEmployeeIdentity(person);
        if (phone && existingKeys.has(`${name}::${phone}`)) {
            duplicates.push({ name: person.name, phone: person.phone, reason: 'Already in the database (same name + phone)' });
        }
        else if (!phone && existingNameSet.has(name)) {
            duplicates.push({ name: person.name, phone: person.phone, reason: 'Same normalised name already in the database (no phone to disambiguate)' });
        }
        else {
            toCreate += 1;
        }
    }
    const exampleLimit = 20;
    return {
        perSheet: merged.perSheet.map((s) => ({
            sheet: s.sheet,
            rows: s.rows,
            skipped: s.skipped.slice(0, exampleLimit),
            skippedCount: s.skipped.length,
            ambiguous: s.ambiguous.slice(0, exampleLimit),
            ambiguousCount: s.ambiguous.length,
            warnings: s.warnings.slice(0, exampleLimit),
            warningsCount: s.warnings.length,
        })),
        totals: {
            employees: toCreate,
            guarantors: merged.people.filter((p) => p.guarantor).length,
            contracts: merged.people.filter((p) => p.contract).length,
            skippedNoName: merged.skipped.length,
            ambiguous: merged.ambiguous.length,
            duplicates: duplicates.length,
            warnings: merged.warnings.length,
        },
        examples: {
            employees: merged.people.slice(0, exampleLimit).map((p) => ({ name: p.name, phone: p.phone, site: p.siteName, resigned: p.resigned })),
            guarantors: merged.people.filter((p) => p.guarantor).slice(0, exampleLimit).map((p) => ({ employee: p.name, guarantor: p.guarantor?.name, phone: p.guarantor?.phone })),
            contracts: merged.people.filter((p) => p.contract).slice(0, exampleLimit).map((p) => ({ employee: p.name, salary: p.contract?.salary, transport: p.contract?.transportAllowance, total: p.contract?.totalPay })),
            duplicates: duplicates.slice(0, exampleLimit),
            warnings: merged.warnings.slice(0, exampleLimit),
            skipped: merged.skipped.slice(0, exampleLimit),
            ambiguous: merged.ambiguous.slice(0, exampleLimit),
        },
    };
}
exports.default = router;
//# sourceMappingURL=import.routes.js.map