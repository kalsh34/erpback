import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS, EmployeeCategory, EmployeeStatus, Gender } from '../../../types';
import { parseWorkbook, ParsedWorkbook } from './excelImport.service';
import { mergeSheets, MergeResult, ImportOptions, PersonDraft } from './mergeSheets';
import { personKey, normalizeNameForMatch } from './cleaning';
import { IMPORT_FIELDS, IMPORT_FIELDS_META } from './importFields.meta';
import { Employee } from '../../../models/Employee';
import { Contract } from '../../../models/Contract';
import { Guarantor } from '../../../models/Guarantor';
import { Site } from '../../../models/Site';
import { EmployeeService } from '../employees/employee.service';
import { ContractService } from '../contracts/contract.service';
import { GuarantorService } from '../guarantor/guarantor.service';
import { AuditService } from '../../../core/audit/AuditService';
import { IEmployee } from '../../../models/Employee';

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, fields: 3, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') cb(null, true);
    else cb(new Error('Only .xlsx and .xls files are supported'));
  },
});

const router = Router();
router.use(authenticate);

interface SheetPayload {
  name: string;
  columns?: string[];
  headerRow?: number | null;
  rows?: string[][];
}
interface PreviewPayload {
  sheets?: SheetPayload[];
  mapping?: Record<string, Record<string, number>>;
  options?: Partial<ImportOptions>;
}

const DEFAULT_OPTIONS: ImportOptions = {
  ethiopianDates: false,
  defaultDepartment: '',
  defaultContractType: 'Full-Time',
  defaultPosition: 'Guard',
};

function sanitizeSheets(raw: unknown): SheetPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s: any) => s && typeof s === 'object' && typeof s.name === 'string')
    .map((s: any) => ({
      name: String(s.name),
      columns: Array.isArray(s.columns) ? s.columns.map((c: any) => String(c)) : [],
      headerRow: typeof s.headerRow === 'number' ? s.headerRow : null,
      rows: Array.isArray(s.rows) ? s.rows.map((r: any) => (Array.isArray(r) ? r.map((c: any) => String(c ?? '')) : [])) : [],
    }));
}

function sanitizeOptions(raw: unknown): ImportOptions {
  const o = (raw || {}) as Partial<ImportOptions>;
  return {
    ethiopianDates: !!o.ethiopianDates,
    defaultDepartment: String(o.defaultDepartment || '').trim(),
    defaultContractType: String(o.defaultContractType || DEFAULT_OPTIONS.defaultContractType).trim() || DEFAULT_OPTIONS.defaultContractType,
    defaultPosition: String(o.defaultPosition || DEFAULT_OPTIONS.defaultPosition).trim() || DEFAULT_OPTIONS.defaultPosition,
  };
}

// ── POST /excel ─────────────────────────────────────────────────────────────
router.post('/excel', authorize(PERMISSIONS.EMPLOYEE_CREATE), upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }
    const result: ParsedWorkbook = parseWorkbook(req.file.buffer, req.file.originalname);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'The file exceeds the 10 MB limit' : err.message });
      return;
    }
    res.status(400).json({ success: false, message: err?.message || 'The file could not be read as a workbook' });
  }
});

// ── POST /preview (dry run, no writes) ─────────────────────────────────────
router.post('/preview', authorize(PERMISSIONS.EMPLOYEE_CREATE), expressJsonOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = (req.body || {}) as PreviewPayload;
    const sheets = sanitizeSheets(payload.sheets);
    const options = sanitizeOptions(payload.options);
    const mappingRaw = payload.mapping || {};
    const mapping: Record<string, Record<string, number>> = {};
    Object.entries(mappingRaw).forEach(([sheetName, m]) => {
      const norm: Record<string, number> = {};
      Object.entries(m || {}).forEach(([k, v]) => { if (typeof v === 'number' && v >= 0) norm[k] = v; });
      mapping[sheetName] = norm;
    });

    const merged = mergeSheets(sheets as any, mapping as any, options);
    const report = await buildPreviewReport(merged);
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// ── POST /commit ───────────────────────────────────────────────────────────
router.post('/commit', authorize(PERMISSIONS.EMPLOYEE_CREATE), expressJsonOnly, async (req: Request, res: Response, next: NextFunction) => {
  const createdDocs: { model: any; id: any }[] = [];
  try {
    const payload = (req.body || {}) as PreviewPayload & { fileName?: string };
    const sheets = sanitizeSheets(payload.sheets);
    const options = sanitizeOptions(payload.options);
    const mappingRaw = payload.mapping || {};
    const mapping: Record<string, Record<string, number>> = {};
    Object.entries(mappingRaw).forEach(([sheetName, m]) => {
      const norm: Record<string, number> = {};
      Object.entries(m || {}).forEach(([k, v]) => { if (typeof v === 'number' && v >= 0) norm[k] = v; });
      mapping[sheetName] = norm;
    });

    const user = (req as any).user;
    const auditCtx = { userId: String(user?._id || user?.userId || ''), ip: req.ip, ua: req.get('user-agent') };
    const merged = mergeSheets(sheets as any, mapping as any, options);

    const usesTxn = await supportsTransactions();
    let session: mongoose.ClientSession | null = null;
    if (usesTxn) session = await mongoose.startSession();

    const report = {
      created: { employees: 0, guarantors: 0, contracts: 0 },
      skippedDuplicates: [] as { name: string; phone: string | null; reason: string }[],
      failed: [] as { sheet: string; row: number; name: string; reason: string }[],
      ambiguousRows: merged.ambiguous,
      warnings: merged.warnings.slice(0, 200),
      usedTransaction: usesTxn,
    };

    // Existing people for idempotency: normalised name + normalised phone.
    const existingEmployees = await Employee.find({}).lean();
    const existingByName = new Map<string, any[]>();
    for (const e of existingEmployees) {
      const n = normalizeNameForMatch([e.firstName, e.middleName, e.lastName].filter(Boolean).join(' '));
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
    const siteCache = new Map<string, any>();
    const resolveSite = async (siteName: string | null): Promise<any> => {
      if (!siteName) return undefined;
      const normSite = normalizeNameForMatch(siteName);
      if (siteCache.has(normSite)) return siteCache.get(normSite);
      const site = await Site.findOne({
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
        const personDocs: { model: any; id: any }[] = [];
        try {
          // Build the exact name the employee will store BEFORE the duplicate
          // check, so the identity matches what later commits read back from
          // the DB (a single-token name is duplicated into firstName+lastName).
          const parts = splitName(person.name);
          const storedName = [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(' ');
          const { name: nName, phone: nPhone } = {
            name: normalizeNameForMatch(storedName),
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

          const employeeData: Partial<IEmployee> = {
            employeeCode: await nextEmployeeCode(),
            firstName: parts.firstName,
            middleName: parts.middleName,
            lastName: parts.lastName,
            category: EmployeeCategory.GUARD,
            status: EmployeeStatus.INACTIVE,
            gender: person.gender === 'MALE' ? Gender.MALE : person.gender === 'FEMALE' ? Gender.FEMALE : undefined,
            phone: person.phone || undefined,
            hireDate: person.hireDate ? new Date(person.hireDate) : undefined,
          };
          if (/^\d{4}-\d{2}-\d{2}$/.test(String(person.hireDate || '')) === false) delete employeeData.hireDate;
          const homeSiteId = await resolveSite(person.siteName);
          if (homeSiteId) employeeData.homeSiteId = homeSiteId as any;
          if (person.age != null && person.age > 0) {
            employeeData.dateOfBirth = approximateBirthYear(person.age);
          }

          // Transaction per person when available; otherwise compensate.
          if (session) { session.startTransaction(); }
          try {
            const employee = await EmployeeService.create(employeeData, auditCtx);
            personDocs.push({ model: Employee, id: (employee as any)._id });

            if (person.guarantor && (person.guarantor.name || person.guarantor.phone)) {
              const guarantor = await GuarantorService.create({
                employeeId: (employee as any)._id as any,
                guarantorType: 'PERSON',
                fullName: person.guarantor.name || 'Unknown guarantor name',
                phone: person.guarantor.phone || '—',
                documents: [],
              } as any, auditCtx);
              personDocs.push({ model: Guarantor, id: (guarantor as any)._id });
              report.created.guarantors += 1;
            }

            if (person.contract && person.contract.salary != null) {
              // Contract start: the cleaned hire date when it IS a valid date;
              // otherwise today. Never commit an Invalid Date.
              const start = parseIsoOrNull(person.hireDate) || new Date();
              const contract = await ContractService.create({
                employeeId: (employee as any)._id as any,
                contractStartDate: start,
                contractType: options.defaultContractType,
                department: options.defaultDepartment || undefined,
                jobPosition: options.defaultPosition,
                wage: person.contract.salary ?? 0,
                transportAllowance: person.contract.transportAllowance ?? 0,
                nonTaxableAllowance: person.contract.totalPay ?? 0,
              } as any, auditCtx);
              personDocs.push({ model: Contract, id: (contract as any)._id });
              report.created.contracts += 1;
            }

            // Marking a resigned import TERMINATED must not kill the person on
            // its own activation rules — set it directly on the fresh record.
            if (person.resigned) {
              await Employee.updateOne(
                { _id: (employee as any)._id },
                { $set: { status: EmployeeStatus.TERMINATED, terminationReason: 'Imported as resigned/exited guard', terminationDate: new Date() } },
              );
            }

            if (session) { await session.commitTransaction(); }
            report.created.employees += 1;
            // Track in-memory so duplicates later in the same file also skip.
            existingByName.set(keyFull, [{ _id: (employee as any)._id }]);
          } catch (personErr: any) {
            if (session) { try { await session.abortTransaction(); } catch { /* already aborted */ } }
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
        } catch (rowErr: any) {
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
    if (session) session.endSession();

    await AuditService.log({
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
  } catch (err) {
    for (const { model, id } of createdDocs.splice(0)) {
      await model.deleteOne({ _id: id }).catch(() => { });
    }
    next(err);
  }
});

function expressJsonOnly(_req: Request, _res: Response, next: NextFunction) { next(); }

/** ISO yyyy-mm-dd or null (never an Invalid Date). */
function parseIsoOrNull(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + 'T00:00:00.000Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeRegex(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitName(full: string): { firstName: string; middleName?: string; lastName: string } {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] };
}

function approximateBirthYear(age: number): Date {
  const y = new Date().getUTCFullYear() - Number(age);
  return new Date(Date.UTC(y, 0, 1));
}

/** Person → normalised name and digits-only phone for duplicate matching. */
function normalizeEmployeeIdentity(person: PersonDraft): { name: string; phone: string | null } {
  const name = normalizeNameForMatch(person.name);
  const phone = person.phone ? person.phone.replace(/\D+/g, '') : null;
  return { name, phone };
}

/** Sequential employee code VSP-<n> mirroring the guard registration logic. */
async function nextEmployeeCode(): Promise<string> {
  const prefix = 'VSP';
  const Organization = (await import('../../../core/organizations/Organization')).Organization;
  const org = await Organization.findOneAndUpdate(
    { employeeCodePrefix: prefix },
    { $inc: { nextEmployeeCode: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `${prefix}-${org!.nextEmployeeCode}`;
}

async function supportsTransactions(): Promise<boolean> {
  try {
    const hello = await mongoose.connection.db!.admin().command({ hello: 1 } as any);
    return !!(hello as any).setName;
  } catch {
    return false;
  }
}

// ── Preview builder: same merged people, plus live-DB duplicates ───────────
async function buildPreviewReport(merged: MergeResult) {
  const existingEmployees = await Employee.find({}).lean();
  const existingKeys = new Set<string>();
  const existingNameSet = new Set<string>();
  for (const e of existingEmployees) {
    const n = normalizeNameForMatch([e.firstName, e.middleName, e.lastName].filter(Boolean).join(' '));
    const p = (e.phone || '').replace(/\D+/g, '');
    if (p) existingKeys.add(`${n}::${p}`);
    existingNameSet.add(n);
  }

  let toCreate = 0;
  const duplicates: { name: string; phone: string | null; reason: string }[] = [];
  for (const person of merged.people) {
    const { name, phone } = normalizeEmployeeIdentity(person);
    if (phone && existingKeys.has(`${name}::${phone}`)) {
      duplicates.push({ name: person.name, phone: person.phone, reason: 'Already in the database (same name + phone)' });
    } else if (!phone && existingNameSet.has(name)) {
      duplicates.push({ name: person.name, phone: person.phone, reason: 'Same normalised name already in the database (no phone to disambiguate)' });
    } else {
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

export default router;
