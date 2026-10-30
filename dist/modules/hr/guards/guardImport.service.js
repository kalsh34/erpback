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
exports.GuardImportService = void 0;
const xlsx = __importStar(require("xlsx"));
const Employee_1 = require("../../../models/Employee");
const GuardProfile_1 = require("../../../models/GuardProfile");
const PrimarySiteAssignment_1 = require("../../../models/PrimarySiteAssignment");
const Contract_1 = require("../../../models/Contract");
const Site_1 = require("../../../models/Site");
const Guarantor_1 = require("../../../models/Guarantor");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
const TITLE_PREFIXES = ['አቶ', 'ወ/ሮ', 'ወ/ሪት', 'ወ/ር', 'ኮ/ር', 'ዶ/ር', 'ኢ/ር', 'ሻምበል', 'ሻለቃ', 'ሌ/ኮ', 'mr', 'mrs', 'ms'];
function cleanString(val) {
    if (val === null || val === undefined)
        return '';
    return String(val).trim();
}
function parseName(fullNameRaw) {
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
    }
    else if (parts.length === 2) {
        return {
            firstName: parts[0],
            middleName: undefined,
            lastName: parts[1],
        };
    }
    else if (parts.length === 1) {
        return {
            firstName: parts[0],
            middleName: undefined,
            lastName: parts[0],
        };
    }
    return { firstName: 'Unknown', lastName: 'Guard' };
}
function normalizePhone(val) {
    if (!val)
        return '';
    // A cell can hold more than one number ("0970901614/951421990"); keep the first
    // real one instead of gluing the digits together.
    for (const run of String(val).match(/\d+/g) || []) {
        if (run.length === 10 && run.startsWith('0'))
            return run;
        if (run.length === 9 && run.startsWith('9'))
            return `0${run}`;
        if (run.length === 12 && run.startsWith('251'))
            return `0${run.slice(3)}`;
    }
    const digits = String(val).replace(/\D/g, '');
    if (digits.length === 9 && digits.startsWith('9')) {
        return `0${digits}`;
    }
    return digits;
}
function parseExcelDate(val) {
    if (!val)
        return new Date();
    if (val instanceof Date && !isNaN(val.getTime()))
        return val;
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
        if (y < 100)
            y += 2000;
        const dObj = new Date(y, m - 1, d);
        if (!isNaN(dObj.getTime()))
            return dObj;
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()))
        return parsed;
    return new Date();
}
/**
 * Fingerprint column: ✓/✔/√/አዎ/yes/right → true, ✗/✘/x/አይ/no → false,
 * blank/unrecognised → undefined (not provided in the sheet).
 */
function parseFingerprint(val) {
    const s = cleanString(val).toLowerCase();
    if (!s)
        return undefined;
    if (['✓', '✔', '√', 'አዎ', 'አዎን', 'yes', 'y', 'true', 'right', '1'].includes(s))
        return true;
    if (['x', '✗', '✘', '×', 'አይ', 'አይም', 'no', 'n', 'false', '0'].includes(s))
        return false;
    // A check/cross glyph inside a longer cell still decides the value.
    if (/[✓✔√]/.test(s))
        return true;
    if (/[✗✘×]/.test(s))
        return false;
    return undefined;
}
function parseNumber(val) {
    if (typeof val === 'number')
        return isNaN(val) ? 0 : val;
    if (!val)
        return 0;
    const cleaned = String(val).replace(/,/g, '');
    const match = cleaned.match(/[\d.]+/);
    if (match) {
        const num = parseFloat(match[0]);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}
function generateSiteCode(siteName) {
    const hash = Math.abs(siteName.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0))
        .toString(36)
        .toUpperCase()
        .substring(0, 4);
    return `SITE-${hash}`;
}
async function getNextEmployeeCode() {
    const prefix = 'VSP';
    const employees = await Employee_1.Employee.find({ employeeCode: /^VSP-\d+$/ }, { employeeCode: 1 }).lean();
    let maxSeq = 200;
    for (const emp of employees) {
        const num = parseInt(emp.employeeCode.replace('VSP-', ''), 10);
        if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
        }
    }
    return `${prefix}-${maxSeq + 1}`;
}
function normalizeHeaderMap(rawRow) {
    const normalized = {};
    for (const [key, val] of Object.entries(rawRow)) {
        const k = key.trim().toLowerCase();
        // Name
        if (k.includes('ሙሉ ስም') || k.includes('fullname') || k.includes('full name') || k === 'name') {
            normalized['fullName'] = val;
        }
        else if (k.includes('ፆታ') || k === 'gender' || k === 'sex') {
            normalized['gender'] = val;
        }
        else if (k.includes('ዕድሜ') || k === 'age') {
            normalized['age'] = val;
        }
        else if (k.includes('የት/ደረጃ') || k.includes('ት/ደረጃ') || k.includes('education') || k.includes('educational')) {
            normalized['education'] = val;
        }
        else if (k.includes('fingerprint') || k.includes('finger print') || k.includes('finger') || k.includes('የጣት አሻ') || k.includes('ጣት')) {
            normalized['fingerprint'] = val;
        }
        else if (k.includes('ክ/ከተማ') || k.includes('subcity') || k.includes('sub city')) {
            normalized['subCity'] = val;
        }
        else if (k.includes('ወረዳ') || k === 'woreda') {
            normalized['woreda'] = val;
        }
        else if (k.includes('ቤ.ቁጥር') || k.includes('የቤ.ቁጥር') || k.includes('house')) {
            normalized['houseNo'] = val;
        }
        else if (k.includes('ዋስ ስልክ') || k.includes('guarantor phone') || (k.includes('guarantor') && k.includes('phone'))) {
            // Must be checked before the generic phone branch: 'የዋስ ስልክ' also contains 'ስልክ'.
            normalized['guarantorPhone'] = val;
        }
        else if (k.includes('ስ. ቁጥር') || k.includes('ስልክ') || k.includes('phone') || k === 'tel') {
            normalized['phone'] = val;
        }
        else if (k.includes('የተቀጠረበት') || k.includes('ቀን') || k.includes('hire') || k.includes('start date')) {
            normalized['hireDate'] = val;
        }
        else if (k.includes('የተመደበበት ሳይት') || k.includes('ሳይት') || k.includes('site')) {
            normalized['site'] = val;
        }
        else if (k.includes('ደመወዝ') || k.includes('salary') || k.includes('wage')) {
            normalized['salary'] = val;
        }
        else if (k.includes('ትራንስፖርት') || k.includes('transport')) {
            normalized['transport'] = val;
        }
        else if (k.includes('ዋስ ስም') || k.includes('የዋስ ስም') || k.includes('guarantor name')) {
            normalized['guarantorName'] = val;
        }
        else {
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
function detectHeaderRow(grid) {
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
class GuardImportService {
    static async previewSheet(buffer) {
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
        });
        const headerRow = detectHeaderRow(grid);
        const rawRows = xlsx.utils.sheet_to_json(firstSheet, {
            defval: '',
            raw: false,
            range: headerRow,
        });
        const existingEmployees = await Employee_1.Employee.find({ category: types_1.EmployeeCategory.GUARD }, { firstName: 1, lastName: 1, phone: 1, employeeCode: 1 }).lean();
        const existingSites = await Site_1.Site.find({}, { siteName: 1 }).lean();
        const siteNamesSet = new Set(existingSites.map((s) => s.siteName.toLowerCase().trim()));
        const rows = [];
        const newSitesSet = new Set();
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
            const warnings = [];
            // Check duplicates
            const isDuplicate = existingEmployees.some((emp) => {
                const nameMatch = emp.firstName.toLowerCase() === firstName.toLowerCase() &&
                    emp.lastName.toLowerCase() === lastName.toLowerCase();
                const phoneMatch = phone && emp.phone && emp.phone === phone;
                return nameMatch || phoneMatch;
            });
            // Gender
            const genderRaw = cleanString(row['gender']).toLowerCase();
            const gender = genderRaw === 'ሴ' || genderRaw === 'female' || genderRaw === 'f' ? types_1.Gender.FEMALE : types_1.Gender.MALE;
            // Age & DOB
            const age = parseNumber(row['age']);
            const currentYear = new Date().getFullYear();
            const dateOfBirth = age > 0 ? new Date(currentYear - age, 0, 1).toISOString().split('T')[0] : undefined;
            // Address
            const subCity = cleanString(row['subCity']);
            const woreda = cleanString(row['woreda']);
            const houseNo = cleanString(row['houseNo']);
            const addressParts = [];
            if (subCity)
                addressParts.push(`ክ/ከተማ: ${subCity}`);
            if (woreda)
                addressParts.push(`ወረዳ: ${woreda}`);
            if (houseNo)
                addressParts.push(`የቤ.ቁጥር: ${houseNo}`);
            const address = addressParts.join(', ');
            // Hire date
            const hireDateObj = parseExcelDate(row['hireDate']);
            const hireDate = hireDateObj.toISOString().split('T')[0];
            // Salary & Allowance
            const salaryRaw = row['salary'];
            const salary = parseNumber(salaryRaw);
            const transportAllowance = parseNumber(row['transport']);
            let notes = undefined;
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
            const status = isDuplicate
                ? 'DUPLICATE'
                : (!firstName || !lastName)
                    ? 'INVALID'
                    : 'READY';
            if (status === 'READY')
                readyCount++;
            else if (status === 'DUPLICATE')
                duplicateCount++;
            else
                invalidCount++;
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
                position: isLeader ? types_1.GuardPosition.SITE_LEADER : types_1.GuardPosition.GUARD,
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
    static async executeImport(rowsToImport, auditCtx) {
        let importedCount = 0;
        let skippedCount = 0;
        const createdList = [];
        for (const item of rowsToImport) {
            if (item.status === 'DUPLICATE' || item.status === 'INVALID') {
                skippedCount++;
                continue;
            }
            // Double-check duplicate by name
            const existing = await Employee_1.Employee.findOne({
                firstName: item.firstName,
                lastName: item.lastName,
                category: types_1.EmployeeCategory.GUARD,
            });
            if (existing) {
                skippedCount++;
                continue;
            }
            // 1. Resolve or create Site
            let site = await Site_1.Site.findOne({
                siteName: { $regex: new RegExp(`^${item.siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            });
            if (!site) {
                const code = generateSiteCode(item.siteName);
                site = await Site_1.Site.create({
                    siteName: item.siteName,
                    siteCode: code,
                    location: item.address || item.siteName,
                    siteType: types_1.SiteType.COMMERCIAL,
                    status: types_1.SiteStatus.ACTIVE,
                    radiusMeters: 100,
                    agreedManpower: 1,
                    actualManpower: 1,
                });
            }
            // 2. Generate employee code
            const employeeCode = await getNextEmployeeCode();
            const hireDate = item.hireDate ? new Date(item.hireDate) : new Date();
            // 3. Create Employee
            const employee = await Employee_1.Employee.create({
                employeeCode,
                firstName: item.firstName,
                middleName: item.middleName,
                lastName: item.lastName,
                category: types_1.EmployeeCategory.GUARD,
                status: types_1.EmployeeStatus.ACTIVE,
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
                    employmentType: types_1.EmploymentType.CONTRACT,
                },
            });
            // 4. Create GuardProfile
            const hourlyRate = item.salary > 0 ? Math.round((item.salary / 192) * 100) / 100 : 0;
            await GuardProfile_1.GuardProfile.create({
                employeeId: employee._id,
                position: item.position,
                employmentType: 'CONTRACT',
                rate: hourlyRate,
                transportAllowance: item.transportAllowance,
            });
            // 5. Create PrimarySiteAssignment
            await PrimarySiteAssignment_1.PrimarySiteAssignment.create({
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
            // 6. Create Contract
            await Contract_1.Contract.create({
                employeeId: employee._id,
                contractStartDate: hireDate,
                contractType: 'Full-Time',
                wage: item.salary,
                transportAllowance: item.transportAllowance,
                pensionEnrolled: true,
                status: 'ACTIVE',
                notes: item.notes,
            });
            // 7. Create Guarantor
            if (item.guarantorName) {
                await Guarantor_1.Guarantor.create({
                    employeeId: employee._id,
                    guarantorType: Guarantor_1.GuarantorType.PERSON,
                    fullName: item.guarantorName,
                    phone: item.guarantorPhone || '0000000000',
                    verificationStatus: Guarantor_1.GuarantorVerificationStatus.VERIFIED,
                    notes: 'Imported via Vital ERP Sheet Import UI',
                });
            }
            if (auditCtx) {
                AuditService_1.AuditService.log({
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
            EventBus_1.eventBus.emit('hr.guard.registered', { employeeId: employee._id, employeeCode });
            createdList.push({
                employeeCode,
                name: `${item.firstName} ${item.lastName}`,
                site: site.siteName,
            });
            importedCount++;
        }
        return {
            success: true,
            importedCount,
            skippedCount,
            createdEmployees: createdList,
        };
    }
}
exports.GuardImportService = GuardImportService;
//# sourceMappingURL=guardImport.service.js.map