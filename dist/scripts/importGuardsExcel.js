"use strict";
/**
 * Vital ERP — Automated Excel Guard Roster Import Script
 *
 * Imports guard rosters (like `new testBook1.xlsx`) directly into Vital ERP MongoDB.
 * Creates/links:
 *   - Site (creates deployment site if it doesn't already exist)
 *   - Employee (with normalized Amharic names, phone, address, hire date, salary)
 *   - GuardProfile (with position: GUARD or SITE_LEADER, rate, allowances)
 *   - PrimarySiteAssignment (deployment site link)
 *   - Contract (active full-time contract)
 *   - Guarantor (verified guarantor with phone & details)
 *
 * Usage:
 *   npm run import:guards
 *   or: npx ts-node --transpile-only src/scripts/importGuardsExcel.ts [path/to/file.xlsx]
 */
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
exports.importGuardsFromExcel = importGuardsFromExcel;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// @ts-ignore
const xlsx = __importStar(require("xlsx"));
const Employee_1 = require("../models/Employee");
const GuardProfile_1 = require("../models/GuardProfile");
const PrimarySiteAssignment_1 = require("../models/PrimarySiteAssignment");
const Contract_1 = require("../models/Contract");
const Site_1 = require("../models/Site");
const Guarantor_1 = require("../models/Guarantor");
const types_1 = require("../types");
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';
// Amharic title prefixes to strip when splitting names
const TITLE_PREFIXES = ['አቶ', 'ወ/ሮ', 'ወ/ሪት', 'ወ/ር', 'ኮ/ር', 'ዶ/ር', 'ኢ/ር', 'ሻምበል', 'ሻለቃ', 'ሌ/ኮ'];
function cleanString(val) {
    if (val === null || val === undefined)
        return '';
    return String(val).trim();
}
function parseName(fullNameRaw) {
    let cleaned = cleanString(fullNameRaw);
    for (const prefix of TITLE_PREFIXES) {
        if (cleaned.startsWith(prefix)) {
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
    const digits = String(val).replace(/\D/g, '');
    if (!digits)
        return '';
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
    // Numeric Excel serial number (days since 1899-12-30)
    if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('/'))) {
        const num = Number(val);
        const utc_days = Math.floor(num - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        if (!isNaN(date_info.getTime())) {
            return date_info;
        }
    }
    // String format like "1/21/14" (M/D/YY) or "2014-01-21"
    const str = String(val).trim();
    const slashParts = str.split('/');
    if (slashParts.length === 3) {
        let [m, d, y] = slashParts.map(p => parseInt(p, 10));
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
    let maxSeq = 202; // existing DB max is VSP-202
    for (const emp of employees) {
        const num = parseInt(emp.employeeCode.replace('VSP-', ''), 10);
        if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
        }
    }
    return `${prefix}-${maxSeq + 1}`;
}
async function findOrCreateSite(siteRaw, defaultLocation = '') {
    let cleanName = siteRaw.trim();
    let isLeader = false;
    if (cleanName.includes('ሰ/ሀላፊ') || cleanName.includes('ሰ/መሪ')) {
        isLeader = true;
        cleanName = cleanName.replace(/ሰ\/ሀላፊ|ሰ\/መሪ/g, '').trim();
    }
    if (!cleanName) {
        cleanName = 'General Deployment Site';
    }
    // Look for existing site by exact or case-insensitive match
    let site = await Site_1.Site.findOne({
        siteName: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (!site) {
        const code = generateSiteCode(cleanName);
        site = await Site_1.Site.create({
            siteName: cleanName,
            siteCode: code,
            location: defaultLocation || cleanName,
            siteType: types_1.SiteType.COMMERCIAL,
            status: types_1.SiteStatus.ACTIVE,
            radiusMeters: 100,
            agreedManpower: 1,
            actualManpower: 1,
        });
        console.log(`  [Site Created] "${cleanName}" with code ${site.siteCode}`);
    }
    return { site, isLeader };
}
async function importGuardsFromExcel(filePath) {
    let targetFile = filePath || process.argv[2];
    if (!targetFile) {
        const candidatePaths = [
            path_1.default.resolve(process.cwd(), 'new testBook1.xlsx'),
            path_1.default.resolve(process.cwd(), '..', 'new testBook1.xlsx'),
            path_1.default.resolve(__dirname, '../../../../new testBook1.xlsx'),
            path_1.default.resolve(__dirname, '../../../new testBook1.xlsx'),
        ];
        for (const p of candidatePaths) {
            if (fs_1.default.existsSync(p)) {
                targetFile = p;
                break;
            }
        }
    }
    if (!targetFile || !fs_1.default.existsSync(targetFile)) {
        throw new Error(`Excel file not found. Checked candidate paths.`);
    }
    console.log(`====================================================`);
    console.log(`Vital ERP — Guard Roster Excel Migration`);
    console.log(`Source File: ${targetFile}`);
    console.log(`====================================================`);
    await mongoose_1.default.connect(MONGODB_URI);
    console.log(`[Database] Connected to ${MONGODB_URI}`);
    // Clean up any earlier test run with low employee codes VSP-1..VSP-17
    const oldTestEmps = await Employee_1.Employee.find({ employeeCode: { $in: Array.from({ length: 20 }, (_, i) => `VSP-${i + 1}`) } });
    if (oldTestEmps.length > 0) {
        const oldIds = oldTestEmps.map(e => e._id);
        await Employee_1.Employee.deleteMany({ _id: { $in: oldIds } });
        await GuardProfile_1.GuardProfile.deleteMany({ employeeId: { $in: oldIds } });
        await PrimarySiteAssignment_1.PrimarySiteAssignment.deleteMany({ guardId: { $in: oldIds } });
        await Contract_1.Contract.deleteMany({ employeeId: { $in: oldIds } });
        await Guarantor_1.Guarantor.deleteMany({ employeeId: { $in: oldIds } });
        console.log(`[Cleanup] Removed ${oldTestEmps.length} test records with legacy codes.`);
    }
    const workbook = xlsx.readFile(targetFile);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read raw objects
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });
    console.log(`[Excel] Loaded sheet "${sheetName}" with ${rawRows.length} rows.`);
    let importedCount = 0;
    let skippedCount = 0;
    for (let i = 0; i < rawRows.length; i++) {
        const raw = rawRows[i];
        // Trim column keys
        const row = {};
        for (const key of Object.keys(raw)) {
            row[key.trim()] = raw[key];
        }
        const fullNameRaw = cleanString(row['ሙሉ ስም']);
        if (!fullNameRaw) {
            console.log(`Row #${i + 2}: Empty name, skipping.`);
            skippedCount++;
            continue;
        }
        const { firstName, middleName, lastName } = parseName(fullNameRaw);
        const phone = normalizePhone(row['ስ. ቁጥር']);
        const genderRaw = cleanString(row['ፆታ']);
        const gender = genderRaw === 'ሴ' ? types_1.Gender.FEMALE : types_1.Gender.MALE;
        // Check duplicate: by full name and category
        const existing = await Employee_1.Employee.findOne({
            firstName,
            lastName,
            category: types_1.EmployeeCategory.GUARD,
        });
        if (existing) {
            console.log(`Row #${i + 2}: Guard "${firstName} ${lastName}" already exists (${existing.employeeCode}), skipping.`);
            skippedCount++;
            continue;
        }
        const employeeCode = await getNextEmployeeCode();
        // Age / Date of Birth
        const age = parseNumber(row['ዕድሜ']);
        const currentYear = new Date().getFullYear();
        const dateOfBirth = age > 0 ? new Date(currentYear - age, 0, 1) : undefined;
        // Address
        const subCity = cleanString(row['ክ/ከተማ']);
        const woreda = cleanString(row['ወረዳ']);
        const houseNo = cleanString(row['የቤ.ቁጥር']);
        const addressParts = [];
        if (subCity)
            addressParts.push(`ክ/ከተማ: ${subCity}`);
        if (woreda)
            addressParts.push(`ወረዳ: ${woreda}`);
        if (houseNo)
            addressParts.push(`የቤ.ቁጥር: ${houseNo}`);
        const address = addressParts.join(', ');
        // Hire date
        const hireDate = parseExcelDate(row['የተቀጠረበት ቀን']);
        // Salary & Allowance
        const salaryRaw = row['የደመወዝ መጠን ብር'];
        const salary = parseNumber(salaryRaw);
        const transportRaw = row['ትራንስፖርት አበል ብር'];
        const transportAllowance = parseNumber(transportRaw);
        // Site & Position
        const siteRaw = cleanString(row['የተመደበበት ሳይት']);
        const { site, isLeader } = await findOrCreateSite(siteRaw, subCity);
        // 1. Create Employee
        const employee = await Employee_1.Employee.create({
            employeeCode,
            firstName,
            middleName,
            lastName,
            category: types_1.EmployeeCategory.GUARD,
            status: types_1.EmployeeStatus.ACTIVE,
            gender,
            phone: phone || undefined,
            address: address || undefined,
            dateOfBirth,
            hireDate,
            homeSiteId: site._id,
            salary,
            transportAllowance,
            guardInfo: {
                employmentType: types_1.EmploymentType.CONTRACT,
            },
        });
        // 2. Create GuardProfile
        const position = isLeader ? types_1.GuardPosition.SITE_LEADER : types_1.GuardPosition.GUARD;
        const hourlyRate = salary > 0 ? Math.round((salary / 192) * 100) / 100 : 0;
        await GuardProfile_1.GuardProfile.create({
            employeeId: employee._id,
            position,
            employmentType: 'CONTRACT',
            rate: hourlyRate,
            transportAllowance,
        });
        // 3. Create PrimarySiteAssignment
        await PrimarySiteAssignment_1.PrimarySiteAssignment.create({
            guardId: employee._id,
            siteId: site._id,
            role: isLeader ? 'SUPERVISOR' : 'GUARD',
            isPrimary: true,
            standardMonthlyHours: 192,
            hourlyRate,
            transportAllowance,
            effectiveFrom: hireDate,
            isCurrent: true,
        });
        // 4. Create Contract
        await Contract_1.Contract.create({
            employeeId: employee._id,
            contractStartDate: hireDate,
            contractType: 'Full-Time',
            wage: salary,
            transportAllowance,
            pensionEnrolled: true,
            status: 'ACTIVE',
            notes: typeof salaryRaw === 'string' && salaryRaw.includes('ዩሮ') ? `Currency noted in Excel: ${salaryRaw}` : undefined,
        });
        // 5. Create Guarantor (if provided)
        let guarantorName = cleanString(row['የዋስ ስም']);
        let guarantorPhone = normalizePhone(row['የዋስ ስልክ']);
        // Handle inline phone inside guarantor name (e.g. "ወንድሙ ጥላሁን መርዳሳ 996558416")
        if (guarantorName && !guarantorPhone) {
            const inlinePhoneMatch = guarantorName.match(/(\d{9,10})/);
            if (inlinePhoneMatch) {
                guarantorPhone = normalizePhone(inlinePhoneMatch[1]);
                guarantorName = guarantorName.replace(inlinePhoneMatch[0], '').trim();
            }
        }
        if (guarantorName) {
            await Guarantor_1.Guarantor.create({
                employeeId: employee._id,
                guarantorType: Guarantor_1.GuarantorType.PERSON,
                fullName: guarantorName,
                phone: guarantorPhone || '0000000000',
                verificationStatus: Guarantor_1.GuarantorVerificationStatus.VERIFIED,
                notes: 'Imported from Excel Guard Roster',
            });
        }
        console.log(`[Imported] #${employeeCode}: ${fullNameRaw} -> Site: ${site.siteName} (${position}) | Salary: ${salary} ETB`);
        importedCount++;
    }
    console.log(`====================================================`);
    console.log(`Migration Complete!`);
    console.log(`Imported: ${importedCount} guards`);
    console.log(`Skipped:  ${skippedCount} guards`);
    console.log(`====================================================`);
    await mongoose_1.default.disconnect();
}
if (require.main === module) {
    importGuardsFromExcel()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=importGuardsExcel.js.map