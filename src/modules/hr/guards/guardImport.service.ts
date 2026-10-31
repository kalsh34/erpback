import * as xlsx from 'xlsx';
import { Employee } from '../../../models/Employee';
import { GuardProfile } from '../../../models/GuardProfile';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { Contract } from '../../../models/Contract';
import { Site } from '../../../models/Site';
import { Guarantor, GuarantorType, GuarantorVerificationStatus } from '../../../models/Guarantor';
import { Organization } from '../../../core/organizations/Organization';
import { EmployeeCategory, EmployeeStatus, EmploymentType, Gender, GuardPosition, SiteType, SiteStatus } from '../../../types';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export interface ParsedGuardRow {
  index: number;
  status: 'READY' | 'DUPLICATE' | 'INVALID';
  fullNameRaw: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: Gender;
  age?: number;
  dateOfBirth?: string;
  education?: string;
  fingerprint?: boolean;
  address?: string;
  phone?: string;
  hireDate: string;
  siteName: string;
  siteExists: boolean;
  isLeader: boolean;
  position: GuardPosition;
  salary: number;
  transportAllowance: number;
  guarantorName?: string;
  guarantorPhone?: string;
  notes?: string;
  warnings: string[];
}

export interface ImportPreviewResponse {
  summary: {
    totalRows: number;
    readyCount: number;
    duplicateCount: number;
    invalidCount: number;
    newSitesCount: number;
  };
  newSites: string[];
  rows: ParsedGuardRow[];
}

const TITLE_PREFIXES = ['አቶ', 'ወ/ሮ', 'ወ/ሪት', 'ወ/ር', 'ኮ/ር', 'ዶ/ር', 'ኢ/ር', 'ሻምበል', 'ሻለቃ', 'ሌ/ኮ', 'mr', 'mrs', 'ms'];

function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function parseName(fullNameRaw: string): { firstName: string; middleName?: string; lastName: string } {
  let cleaned = cleanString(fullNameRaw);
  for (const prefix of TITLE_PREFIXES) {
    if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleaned = cleaned.substring(prefix.length).trim();
      break;
    }
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    return {
      firstName: parts[0],
      middleName: parts[1],
      lastName: parts.slice(2).join(' '),
    };
  } else if (parts.length === 2) {
    return {
      firstName: parts[0],
      middleName: undefined,
      lastName: parts[1],
    };
  } else if (parts.length === 1) {
    return {
      firstName: parts[0],
      middleName: undefined,
      lastName: parts[0],
    };
  }
  return { firstName: 'Unknown', lastName: 'Guard' };
}

function normalizePhone(val: any): string {
  if (!val) return '';
  // A cell can hold more than one number ("0970901614/951421990"); keep the first
  // real one instead of gluing the digits together.
  for (const run of String(val).match(/\d+/g) || []) {
    if (run.length === 10 && run.startsWith('0')) return run;
    if (run.length === 9 && run.startsWith('9')) return `0${run}`;
    if (run.length === 12 && run.startsWith('251')) return `0${run.slice(3)}`;
  }
  const digits = String(val).replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) {
    return `0${digits}`;
  }
  return digits;
}

function parseExcelDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('/'))) {
    const num = Number(val);
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    if (!isNaN(date_info.getTime())) {
      return date_info;
    }
  }

  const str = String(val).trim();
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    let [m, d, y] = slashParts.map((p) => parseInt(p, 10));
    if (y < 100) y += 2000;
    const dObj = new Date(y, m - 1, d);
    if (!isNaN(dObj.getTime())) return dObj;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return new Date();
}

/**
 * Fingerprint column: ✓/✔/√/አዎ/yes/right → true, ✗/✘/x/አይ/no → false,
 * blank/unrecognised → undefined (not provided in the sheet).
 */
function parseFingerprint(val: any): boolean | undefined {
  const s = cleanString(val).toLowerCase();
  if (!s) return undefined;
  if (['✓', '✔', '√', 'አዎ', 'አዎን', 'yes', 'y', 'true', 'right', '1'].includes(s)) return true;
  if (['x', '✗', '✘', '×', 'አይ', 'አይም', 'no', 'n', 'false', '0'].includes(s)) return false;
  // A check/cross glyph inside a longer cell still decides the value.
  if (/[✓✔√]/.test(s)) return true;
  if (/[✗✘×]/.test(s)) return false;
  return undefined;
}

function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '');
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function generateSiteCode(siteName: string): string {
  const hash = Math.abs(siteName.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0))
    .toString(36)
    .toUpperCase()
    .substring(0, 4);
  return `SITE-${hash}`;
}

async function getNextEmployeeCode(): Promise<string> {
  const prefix = 'VSP';
  const employees = await Employee.find({ employeeCode: /^VSP-\d+$/ }, { employeeCode: 1 }).lean();
  let maxSeq = 200;
  for (const emp of employees) {
    const num = parseInt(emp.employeeCode.replace('VSP-', ''), 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }
  return `${prefix}-${maxSeq + 1}`;
}

function normalizeHeaderMap(rawRow: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, val] of Object.entries(rawRow)) {
    const k = key.trim().toLowerCase();
    // Name
    if (k.includes('ሙሉ ስም') || k.includes('fullname') || k.includes('full name') || k === 'name') {
      normalized['fullName'] = val;
    } else if (k.includes('ፆታ') || k === 'gender' || k === 'sex') {
      normalized['gender'] = val;
    } else if (k.includes('ዕድሜ') || k === 'age') {
      normalized['age'] = val;
    } else if (k.includes('የት/ደረጃ') || k.includes('ት/ደረጃ') || k.includes('education') || k.includes('educational')) {
      normalized['education'] = val;
    } else if (k.includes('fingerprint') || k.includes('finger print') || k.includes('finger') || k.includes('የጣት አሻ') || k.includes('ጣት')) {
      normalized['fingerprint'] = val;
    } else if (k.includes('ክ/ከተማ') || k.includes('subcity') || k.includes('sub city')) {
      normalized['subCity'] = val;
    } else if (k.includes('ወረዳ') || k === 'woreda') {
      normalized['woreda'] = val;
    } else if (k.includes('ቤ.ቁጥር') || k.includes('የቤ.ቁጥር') || k.includes('house')) {
      normalized['houseNo'] = val;
    } else if (k.includes('ዋስ ስልክ') || k.includes('guarantor phone') || (k.includes('guarantor') && k.includes('phone'))) {
      // Must be checked before the generic phone branch: 'የዋስ ስልክ' also contains 'ስልክ'.
      normalized['guarantorPhone'] = val;
    } else if (k.includes('ስ. ቁጥር') || k.includes('ስልክ') || k.includes('phone') || k === 'tel') {
      normalized['phone'] = val;
    } else if (k.includes('የተቀጠረበት') || k.includes('ቀን') || k.includes('hire') || k.includes('start date')) {
      normalized['hireDate'] = val;
    } else if (k.includes('የተመደበበት ሳይት') || k.includes('ሳይት') || k.includes('site')) {
      normalized['site'] = val;
    } else if (k.includes('ደመወዝ') || k.includes('salary') || k.includes('wage')) {
      normalized['salary'] = val;
    } else if (k.includes('ትራንስፖርት') || k.includes('transport')) {
      normalized['transport'] = val;
    } else if (k.includes('ዋስ ስም') || k.includes('የዋስ ስም') || k.includes('guarantor name')) {
      normalized['guarantorName'] = val;
    } else {
      normalized[key.trim()] = val;
    }
  }
  return normalized;
}

/**
 * Rosters are often exported with a title/banner block above the real column
 * headers (e.g. a merged "የጥበቃ ሠራተኞች መዝገብ" row). Reading those files with the
 * default header row turns every key into a banner cell and yields zero rows, so
 * scan the first few rows and treat the one with the most known headers as the
 * header row.
 */
function detectHeaderRow(grid: unknown[][]): number {
  const HINTS = [
    'ሙሉ ስም', 'full name', 'fullname', 'ፆታ', 'gender', 'ዕድሜ', 'age',
    'ስ. ቁጥር', 'ስልክ', 'phone', 'ሳይት', 'site', 'ደመወዝ', 'salary',
    'ትራንስፖርት', 'transport', 'ዋስ', 'guarantor', 'የት/ደረጃ', 'education',
  ];
  let bestRow = 0;
  let bestScore = 0;
  const limit = Math.min(grid.length, 10);
  for (let r = 0; r < limit; r++) {
    const cells = (grid[r] || []).map((c) => String(c ?? '').trim().toLowerCase());
    const score = cells.filter((c) => c && HINTS.some((h) => c.includes(h))).length;
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }
  // A single hit is more likely a stray title cell than a header row.
  return bestScore >= 2 ? bestRow : 0;
}

let importQueue: Promise<unknown> = Promise.resolve();

/**
 * Runs one roster import at a time inside this process. Two overlapping
 * submissions (a double-clicked button, a second tab, a retry fired while the
 * first request is still working) otherwise both compute the same next
 * employee code, and the loser dies on the unique index with the unhelpful
 * "A record with this identifier already exists" message.
 */
function withImportLock<T>(run: () => Promise<T>): Promise<T> {
  const next = importQueue.then(run, run);
  importQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/** Creates a site, disambiguating the generated code if it is already taken. */
async function createSite(siteName: string, location?: string) {
  const base = generateSiteCode(siteName);
  for (let attempt = 0; attempt < 5; attempt++) {
    const siteCode = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      return await Site.create({
        siteName,
        siteCode,
        location: location || siteName,
        siteType: SiteType.COMMERCIAL,
        status: SiteStatus.ACTIVE,
        radiusMeters: 100,
        agreedManpower: 1,
        actualManpower: 1,
      });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  throw new Error(`Could not allocate a unique site code for "${siteName}"`);
}

/** Creates an employee, retrying when another request claimed the same code. */
async function createEmployeeWithCode(data: Record<string, any>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const employeeCode = await getNextEmployeeCode();
    try {
      return await Employee.create({ ...data, employeeCode });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  throw new Error('Could not allocate a unique employee code after 5 attempts');
}

/** Turns a driver error into something a human can act on. */
function describeImportError(err: unknown): string {
  if ((err as { code?: number })?.code === 11000) {
    const key = Object.keys((err as { keyPattern?: object }).keyPattern || {}).join(', ');
    return key ? `Duplicate ${key} — a record with this value already exists` : 'Duplicate record — this row already exists';
  }
  return err instanceof Error ? err.message : String(err);
}

export class GuardImportService {
  static async previewSheet(buffer: Buffer): Promise<ImportPreviewResponse> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('No sheets found in workbook');
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    // Keep blank rows so grid indexes stay aligned with real sheet rows.
    const grid = xlsx.utils.sheet_to_json(firstSheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][];
    const headerRow = detectHeaderRow(grid);
    const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(firstSheet, {
      defval: '',
      raw: false,
      range: headerRow,
    });

    const existingEmployees = await Employee.find(
      { category: EmployeeCategory.GUARD },
      { firstName: 1, lastName: 1, phone: 1, employeeCode: 1 }
    ).lean();

    const existingSites = await Site.find({}, { siteName: 1 }).lean();
    const siteNamesSet = new Set(existingSites.map((s) => s.siteName.toLowerCase().trim()));

    const rows: ParsedGuardRow[] = [];
    const newSitesSet = new Set<string>();

    let readyCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = normalizeHeaderMap(rawRows[i]);
      const fullNameRaw = cleanString(row['fullName']);

      if (!fullNameRaw) {
        continue;
      }

      const { firstName, middleName, lastName } = parseName(fullNameRaw);
      const phone = normalizePhone(row['phone']);
      const warnings: string[] = [];

      // Check duplicates
      const isDuplicate = existingEmployees.some((emp) => {
        const nameMatch =
          emp.firstName.toLowerCase() === firstName.toLowerCase() &&
          emp.lastName.toLowerCase() === lastName.toLowerCase();
        const phoneMatch = phone && emp.phone && emp.phone === phone;
        return nameMatch || phoneMatch;
      });

      // Gender
      const genderRaw = cleanString(row['gender']).toLowerCase();
      const gender = genderRaw === 'ሴ' || genderRaw === 'female' || genderRaw === 'f' ? Gender.FEMALE : Gender.MALE;

      // Age & DOB
      const age = parseNumber(row['age']);
      const currentYear = new Date().getFullYear();
      const dateOfBirth = age > 0 ? new Date(currentYear - age, 0, 1).toISOString().split('T')[0] : undefined;

      // Address
      const subCity = cleanString(row['subCity']);
      const woreda = cleanString(row['woreda']);
      const houseNo = cleanString(row['houseNo']);
      const addressParts: string[] = [];
      if (subCity) addressParts.push(`ክ/ከተማ: ${subCity}`);
      if (woreda) addressParts.push(`ወረዳ: ${woreda}`);
      if (houseNo) addressParts.push(`የቤ.ቁጥር: ${houseNo}`);
      const address = addressParts.join(', ');

      // Hire date
      const hireDateObj = parseExcelDate(row['hireDate']);
      const hireDate = hireDateObj.toISOString().split('T')[0];

      // Salary & Allowance
      const salaryRaw = row['salary'];
      const salary = parseNumber(salaryRaw);
      const transportAllowance = parseNumber(row['transport']);

      let notes: string | undefined = undefined;
      if (typeof salaryRaw === 'string' && (salaryRaw.includes('ዩሮ') || salaryRaw.toLowerCase().includes('eur'))) {
        notes = `Foreign currency: ${salaryRaw}`;
        warnings.push(`Noted foreign currency in salary: "${salaryRaw}"`);
      }

      if (salary === 0) {
        warnings.push('Base salary is 0 or unparsed');
      }

      // Site & Leadership
      const siteRaw = cleanString(row['site']);
      let cleanSiteName = siteRaw;
      let isLeader = false;

      if (cleanSiteName.includes('ሰ/ሀላፊ') || cleanSiteName.includes('ሰ/መሪ')) {
        isLeader = true;
        cleanSiteName = cleanSiteName.replace(/ሰ\/ሀላፊ|ሰ\/መሪ/g, '').trim();
      }

      if (!cleanSiteName) {
        cleanSiteName = 'General Deployment Site';
        warnings.push('Deployment site empty; assigned to General Site');
      }

      const siteExists = siteNamesSet.has(cleanSiteName.toLowerCase());
      if (!siteExists) {
        newSitesSet.add(cleanSiteName);
      }

      // Guarantor
      let guarantorName = cleanString(row['guarantorName']);
      let guarantorPhone = normalizePhone(row['guarantorPhone']);
      if (guarantorName && !guarantorPhone) {
        const inlinePhoneMatch = guarantorName.match(/(\d{9,10})/);
        if (inlinePhoneMatch) {
          guarantorPhone = normalizePhone(inlinePhoneMatch[1]);
          guarantorName = guarantorName.replace(inlinePhoneMatch[0], '').trim();
        }
      }

      if (!guarantorName) {
        warnings.push('No guarantor provided');
      }

      const status: 'READY' | 'DUPLICATE' | 'INVALID' = isDuplicate
        ? 'DUPLICATE'
        : (!firstName || !lastName)
        ? 'INVALID'
        : 'READY';

      if (status === 'READY') readyCount++;
      else if (status === 'DUPLICATE') duplicateCount++;
      else invalidCount++;

      rows.push({
        index: i + 1,
        status,
        fullNameRaw,
        firstName,
        middleName,
        lastName,
        gender,
        age: age > 0 ? age : undefined,
        dateOfBirth,
        education: cleanString(row['education']) || undefined,
        fingerprint: parseFingerprint(row['fingerprint']),
        address: address || undefined,
        phone: phone || undefined,
        hireDate,
        siteName: cleanSiteName,
        siteExists,
        isLeader,
        position: isLeader ? GuardPosition.SITE_LEADER : GuardPosition.GUARD,
        salary,
        transportAllowance,
        guarantorName: guarantorName || undefined,
        guarantorPhone: guarantorPhone || undefined,
        notes,
        warnings,
      });
    }

    return {
      summary: {
        totalRows: rows.length,
        readyCount,
        duplicateCount,
        invalidCount,
        newSitesCount: newSitesSet.size,
      },
      newSites: Array.from(newSitesSet),
      rows,
    };
  }

  static async executeImport(
    rowsToImport: ParsedGuardRow[],
    auditCtx?: { userId: string; ip?: string; ua?: string }
  ) {
    // Serialise runs so a second submission waits for this one and then sees the
    // rows it created as duplicates, instead of racing for the same code.
    return withImportLock(() => GuardImportService.runImport(rowsToImport, auditCtx));
  }

  private static async runImport(
    rowsToImport: ParsedGuardRow[],
    auditCtx?: { userId: string; ip?: string; ua?: string }
  ) {
    let importedCount = 0;
    let skippedCount = 0;
    const createdList: { employeeCode: string; name: string; site: string }[] = [];
    const failedList: { name: string; reason: string }[] = [];

    for (const item of rowsToImport) {
      if (item.status === 'DUPLICATE' || item.status === 'INVALID') {
        skippedCount++;
        continue;
      }

      // Double-check duplicate by name
      const existing = await Employee.findOne({
        firstName: item.firstName,
        lastName: item.lastName,
        category: EmployeeCategory.GUARD,
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      const displayName = `${item.firstName} ${item.lastName}`.trim();
      // A row is all-or-nothing: track what it created so a failure is rolled back
      // instead of leaving a guard with no profile or contract behind.
      const createdByThisRow: { model: any; id: any }[] = [];

      try {
        // 1. Resolve or create Site
        let site = await Site.findOne({
          siteName: { $regex: new RegExp(`^${item.siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });

        if (!site) {
          site = await createSite(item.siteName, item.address);
          createdByThisRow.push({ model: Site, id: site._id });
        }

        const hireDate = item.hireDate ? new Date(item.hireDate) : new Date();

        // 2. Create Employee — the code is allocated (and retried) inside.
        const employee = await createEmployeeWithCode({
          firstName: item.firstName,
          middleName: item.middleName,
          lastName: item.lastName,
          category: EmployeeCategory.GUARD,
          status: EmployeeStatus.ACTIVE,
          gender: item.gender,
          phone: item.phone,
          address: item.address,
          education: item.education,
          fingerprint: item.fingerprint,
          dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : undefined,
          hireDate,
          homeSiteId: site._id,
          salary: item.salary,
          transportAllowance: item.transportAllowance,
          guardInfo: {
            employmentType: EmploymentType.CONTRACT,
          },
        });
        const employeeCode = employee.employeeCode;
        createdByThisRow.push({ model: Employee, id: employee._id });

        // 3. Create GuardProfile
        const hourlyRate = item.salary > 0 ? Math.round((item.salary / 192) * 100) / 100 : 0;
        const profile = await GuardProfile.create({
          employeeId: employee._id,
          position: item.position,
          employmentType: 'CONTRACT',
          rate: hourlyRate,
          transportAllowance: item.transportAllowance,
        });
        createdByThisRow.push({ model: GuardProfile, id: profile._id });

        // 4. Create PrimarySiteAssignment
        const assignment = await PrimarySiteAssignment.create({
          guardId: employee._id,
          siteId: site._id,
          role: item.isLeader ? 'SUPERVISOR' : 'GUARD',
          isPrimary: true,
          standardMonthlyHours: 192,
          hourlyRate,
          transportAllowance: item.transportAllowance,
          effectiveFrom: hireDate,
          isCurrent: true,
        });
        createdByThisRow.push({ model: PrimarySiteAssignment, id: assignment._id });

        // 5. Create Contract
        const contract = await Contract.create({
          employeeId: employee._id,
          contractStartDate: hireDate,
          contractType: 'Full-Time',
          wage: item.salary,
          transportAllowance: item.transportAllowance,
          pensionEnrolled: true,
          status: 'ACTIVE',
          notes: item.notes,
        });
        createdByThisRow.push({ model: Contract, id: contract._id });

        // 6. Create Guarantor
        if (item.guarantorName) {
          const guarantor = await Guarantor.create({
            employeeId: employee._id,
            guarantorType: GuarantorType.PERSON,
            fullName: item.guarantorName,
            phone: item.guarantorPhone || '0000000000',
            verificationStatus: GuarantorVerificationStatus.VERIFIED,
            notes: 'Imported via Vital ERP Sheet Import UI',
          });
          createdByThisRow.push({ model: Guarantor, id: guarantor._id });
        }

        if (auditCtx) {
          AuditService.log({
            userId: auditCtx.userId,
            action: 'GUARD_IMPORT_EXCEL',
            entity: 'Employee',
            entityId: employee._id.toString(),
            newValues: {
              employeeCode,
              name: `${item.firstName} ${item.lastName}`,
              site: site.siteName,
            },
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
          });
        }

        eventBus.emit('hr.guard.registered', { employeeId: employee._id, employeeCode });
        createdList.push({
          employeeCode,
          name: `${item.firstName} ${item.lastName}`,
          site: site.siteName,
        });
        importedCount++;
      } catch (err) {
        // Undo whatever this row managed to create, then keep going: one bad row
        // must not abort the whole batch with a single opaque message.
        for (const { model, id } of createdByThisRow.reverse()) {
          await model.deleteOne({ _id: id }).catch(() => undefined);
        }
        failedList.push({ name: displayName, reason: describeImportError(err) });
      }
    }

    return {
      success: true,
      importedCount,
      skippedCount,
      createdEmployees: createdList,
      failed: failedList,
    };
  }
}
