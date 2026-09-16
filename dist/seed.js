"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("./models/User");
const Employee_1 = require("./models/Employee");
const GuardProfile_1 = require("./models/GuardProfile");
const PrimarySiteAssignment_1 = require("./models/PrimarySiteAssignment");
const Site_1 = require("./models/Site");
const TaxBracket_1 = require("./models/TaxBracket");
const PensionRule_1 = require("./models/PensionRule");
const PayrollPeriod_1 = require("./models/PayrollPeriod");
const ShiftTemplate_1 = require("./models/ShiftTemplate");
const ShiftAssignment_1 = require("./models/ShiftAssignment");
const SalaryComponent_1 = require("./models/SalaryComponent");
const PayrollFormulaVersion_1 = require("./models/PayrollFormulaVersion");
const SalaryStructure_1 = require("./models/SalaryStructure");
const types_1 = require("./types");
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';
async function seed() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('[SEED] Connected to MongoDB');
        const hash = await bcryptjs_1.default.hash('password123', 12);
        const upsertUser = async (data) => {
            const existing = await User_1.User.findOne({ email: data.email });
            if (existing) {
                existing.password = hash;
                existing.firstName = data.firstName;
                existing.lastName = data.lastName;
                existing.role = data.role;
                if (data.employeeId)
                    existing.employeeId = data.employeeId;
                await existing.save();
                console.log(`[SEED] Updated: ${data.email} (${data.role})`);
            }
            else {
                await User_1.User.create({ ...data, password: hash });
                console.log(`[SEED] Created: ${data.email} (${data.role})`);
            }
        };
        // --- Users (new role structure) ---
        await upsertUser({ email: 'admin@vitalpayroll.com', firstName: 'System', lastName: 'Admin', role: types_1.UserRole.SUPER_ADMIN });
        await upsertUser({ email: 'sysadmin@vitalpayroll.com', firstName: 'System', lastName: 'Admin', role: types_1.UserRole.SYSTEM_ADMIN });
        await upsertUser({ email: 'hr@vitalpayroll.com', firstName: 'Henok', lastName: 'Tadesse', role: types_1.UserRole.HR_ADMIN });
        await upsertUser({ email: 'finance@vitalpayroll.com', firstName: 'Fin', lastName: 'Officer', role: types_1.UserRole.FINANCE_OFFICER });
        await upsertUser({ email: 'ops@vitalpayroll.com', firstName: 'Ops', lastName: 'Manager', role: types_1.UserRole.OPERATIONS });
        await upsertUser({ email: 'head@vitalpayroll.com', firstName: 'Head', lastName: 'Officer', role: types_1.UserRole.HEAD });
        await upsertUser({ email: 'ceo@vitalpayroll.com', firstName: 'Chief', lastName: 'Executive', role: types_1.UserRole.CEO });
        // --- Guard Employee + User ---
        // Guards must be CONTRACTED or guard attendance filing rejects them.
        let guardEmp = await Employee_1.Employee.findOne({ employeeCode: 'VSP-100' });
        if (!guardEmp) {
            guardEmp = await Employee_1.Employee.create({
                employeeCode: 'VSP-100', firstName: 'Abebe', lastName: 'Kebede',
                category: types_1.EmployeeCategory.GUARD, status: types_1.EmployeeStatus.CONTRACTED,
                hireDate: new Date('2023-06-15'), phone: '0911223344',
                guardInfo: { employmentType: types_1.EmploymentType.PERMANENT, idCardNumber: 'ID-001' },
            });
            await GuardProfile_1.GuardProfile.create({ employeeId: guardEmp._id, position: types_1.GuardPosition.GUARD, employmentType: 'PERMANENT' });
            console.log('[SEED] Guard employee: VSP-100 Abebe Kebede (CONTRACTED)');
        }
        else if (guardEmp.status !== types_1.EmployeeStatus.CONTRACTED) {
            guardEmp.status = types_1.EmployeeStatus.CONTRACTED;
            await guardEmp.save();
            console.log('[SEED] Guard VSP-100 status -> CONTRACTED');
        }
        await upsertUser({ email: 'guard@vitalpayroll.com', firstName: 'Abebe', lastName: 'Kebede', role: types_1.UserRole.GUARD, employeeId: guardEmp._id });
        // --- Office Staff (for Finance to manage) ---
        const officeEmps = [
            { code: 'VSP-200', first: 'Berhanu', last: 'W/Giyorgis', phone: '0911223355' },
            { code: 'VSP-201', first: 'Terefe', last: 'Yadeta', phone: '0922334466' },
            { code: 'VSP-202', first: 'Rahel', last: 'Tadesse', phone: '0933445577' },
        ];
        for (const emp of officeEmps) {
            if (!(await Employee_1.Employee.findOne({ employeeCode: emp.code }))) {
                await Employee_1.Employee.create({ employeeCode: emp.code, firstName: emp.first, lastName: emp.last, category: types_1.EmployeeCategory.OFFICE_STAFF, hireDate: new Date('2022-01-15'), phone: emp.phone, position: 'Accountant' });
                console.log(`[SEED] Office: ${emp.code} ${emp.first} ${emp.last}`);
            }
        }
        // --- Sites ---
        const sitesData = [
            { code: 'VSP-HQ', name: 'Head Office', client: 'Vital Security', location: 'Addis Ababa, Bole', type: 'COMMERCIAL', agreed: 15, actual: 12 },
            { code: 'VSP-DK', name: 'Dukem Factory', client: 'Dukem Industrial', location: 'Dukem, Oromia', type: 'INDUSTRIAL', agreed: 20, actual: 18 },
            { code: 'VSP-MT', name: 'Metehara Farm', client: 'Metehara Agro', location: 'Metehara, Amhara', type: 'INDUSTRIAL', agreed: 12, actual: 10 },
            { code: 'VSP-AD', name: 'Adama Mall', client: 'Adama Retail', location: 'Adama, Oromia', type: 'COMMERCIAL', agreed: 10, actual: 8 },
        ];
        for (const s of sitesData) {
            if (!(await Site_1.Site.findOne({ siteCode: s.code }))) {
                await Site_1.Site.create({ siteCode: s.code, siteName: s.name, client: s.client, location: s.location, siteType: s.type, agreedManpower: s.agreed, actualManpower: s.actual });
                console.log(`[SEED] Site: ${s.code} - ${s.name}`);
            }
        }
        // --- Assign guard to HQ site ---
        if (guardEmp) {
            const hqSite = await Site_1.Site.findOne({ siteCode: 'VSP-HQ' });
            if (hqSite && !(await PrimarySiteAssignment_1.PrimarySiteAssignment.findOne({ guardId: guardEmp._id, isCurrent: true }))) {
                await PrimarySiteAssignment_1.PrimarySiteAssignment.create({ guardId: guardEmp._id, siteId: hqSite._id, standardMonthlyHours: 208, hourlyRate: 26.63, effectiveFrom: new Date('2024-01-01'), isCurrent: true });
                console.log('[SEED] Guard VSP-100 -> VSP-HQ (208 hrs, 26.63 ETB/hr)');
            }
            // --- Shift assignment (required before guard attendance can be filed) ---
            if (hqSite) {
                let template = await ShiftTemplate_1.ShiftTemplate.findOne({ name: 'Standard Day (06:00-18:00)' });
                if (!template) {
                    template = await ShiftTemplate_1.ShiftTemplate.create({
                        name: 'Standard Day (06:00-18:00)',
                        description: 'Default 12h day shift for seeded guard',
                        shiftType: 'DAY',
                        startTime: '06:00',
                        endTime: '18:00',
                        maxGuards: 50,
                        minGuards: 1,
                        daysOfWeek: [],
                    });
                    console.log('[SEED] Shift template: Standard Day (06:00-18:00)');
                }
                const admin = await User_1.User.findOne({ role: types_1.UserRole.SUPER_ADMIN });
                if (!(await ShiftAssignment_1.ShiftAssignment.findOne({ guardId: guardEmp._id, siteId: hqSite._id, status: 'ACTIVE' }))) {
                    await ShiftAssignment_1.ShiftAssignment.create({
                        guardId: guardEmp._id,
                        siteId: hqSite._id,
                        shiftTemplateId: template._id,
                        startDate: new Date('2024-01-01'),
                        status: 'ACTIVE',
                        source: types_1.ShiftAssignmentSource.MANUAL,
                        assignedById: admin?._id || guardEmp._id,
                    });
                    console.log('[SEED] Shift assignment: VSP-100 -> VSP-HQ (ACTIVE, from 2024-01-01)');
                }
            }
        }
        // --- Tax Brackets ---
        if (!(await TaxBracket_1.TaxBracket.findOne({ isCurrent: true }))) {
            await TaxBracket_1.TaxBracket.create({
                label: 'Ethiopian Income Tax - Current',
                brackets: [
                    { min: 0, max: 2000, rate: 0, deduction: 0 },
                    { min: 2001, max: 4000, rate: 0.15, deduction: 300 },
                    { min: 4001, max: 7000, rate: 0.20, deduction: 500 },
                    { min: 7001, max: 10000, rate: 0.25, deduction: 850 },
                    { min: 10001, max: 14000, rate: 0.30, deduction: 1350 },
                    { min: 14001, max: null, rate: 0.35, deduction: 2050 },
                ],
                effectiveFrom: new Date('2024-01-01'), isCurrent: true,
            });
            console.log('[SEED] Tax brackets created');
        }
        // --- Pension Rule ---
        if (!(await PensionRule_1.PensionRule.findOne({ isCurrent: true }))) {
            await PensionRule_1.PensionRule.create({ label: 'Ethiopian Pension - Current', employeeRate: 0.07, employerRate: 0.11, effectiveFrom: new Date('2024-01-01'), isCurrent: true });
            console.log('[SEED] Pension rule (7%/11%)');
        }
        // --- Salary Components ---
        const defaultComponents = [
            { code: 'BASIC', label: 'Basic Salary', sourceType: 'CONTRACT' },
            { code: 'RESPONSIBILITY_ALLOWANCE', label: 'Responsibility Allowance', sourceType: 'CONTRACT' },
            { code: 'TELE_ALLOWANCE', label: 'Tele Allowance', sourceType: 'CONTRACT' },
            { code: 'NON_TAXABLE_ALLOWANCE', label: 'Non-Taxable Allowance', sourceType: 'CONTRACT' },
            { code: 'TAXABLE_TRANSPORT', label: 'Taxable Transport', sourceType: 'CONTRACT' },
            { code: 'OT', label: 'Overtime', sourceType: 'HR_MONTHLY_INPUT' },
            { code: 'BONUS', label: 'Bonus', sourceType: 'CONTRACT' },
            { code: 'PENALTY', label: 'Penalty', sourceType: 'HR_MONTHLY_INPUT' },
            { code: 'LOAN', label: 'Loan Deduction', sourceType: 'HR_MONTHLY_INPUT' },
            { code: 'OTHER_DEDUCTIONS', label: 'Other Deductions', sourceType: 'HR_MONTHLY_INPUT' },
        ];
        for (const comp of defaultComponents) {
            await SalaryComponent_1.SalaryComponent.findOneAndUpdate({ code: comp.code }, { $setOnInsert: comp }, { upsert: true, new: true });
        }
        console.log('[SEED] Salary components seeded');
        // --- Default Payroll Formula (v2 — BONUS removed from gross/taxable) ---
        const existingFormula = await PayrollFormulaVersion_1.PayrollFormulaVersion.findOne({ isCurrent: true });
        if (existingFormula) {
            // Mark old formula as no longer current
            existingFormula.isCurrent = false;
            await existingFormula.save();
            console.log(`[SEED] Marked formula v${existingFormula.version} as not current`);
        }
        // Remove stale non-current v2 docs so reruns don't hit the unique version index
        await PayrollFormulaVersion_1.PayrollFormulaVersion.deleteMany({ version: 2, isCurrent: false });
        {
            const admin = await User_1.User.findOne({ role: types_1.UserRole.SUPER_ADMIN });
            await PayrollFormulaVersion_1.PayrollFormulaVersion.create({
                version: 2,
                isCurrent: true,
                effectiveFrom: new Date('2024-01-01'),
                grossComponentCodes: ['BASIC', 'RESPONSIBILITY_ALLOWANCE', 'TELE_ALLOWANCE', 'NON_TAXABLE_ALLOWANCE', 'OT'],
                taxableComponentCodes: ['BASIC', 'RESPONSIBILITY_ALLOWANCE', 'TELE_ALLOWANCE', 'TAXABLE_TRANSPORT', 'OT'],
                pensionBaseComponentCodes: ['BASIC'],
                deductionComponentCodes: ['INCOME_TAX', 'EMPLOYEE_PENSION', 'PENALTY', 'LOAN', 'OTHER_DEDUCTIONS'],
                createdById: admin?._id || new mongoose_1.default.Types.ObjectId(),
            });
            console.log('[SEED] Default payroll formula v2 created (BONUS removed from gross/taxable)');
        }
        // --- Default Salary Structures ---
        const existingStaffStructure = await SalaryStructure_1.SalaryStructure.findOne({ employeeType: 'STAFF', isCurrent: true });
        if (!existingStaffStructure) {
            const admin = await User_1.User.findOne({ role: types_1.UserRole.SUPER_ADMIN });
            await SalaryStructure_1.SalaryStructure.create({
                name: 'Office Staff Standard',
                employeeType: 'STAFF',
                payBasis: 'MONTHLY',
                version: 1,
                isCurrent: true,
                effectiveFrom: new Date('2024-01-01'),
                otMultiplier: 1.5,
                holidayMultiplier: 2.0,
                earnings: [
                    { componentCode: 'BASIC', label: 'Basic Salary', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: true },
                    { componentCode: 'RESPONSIBILITY_ALLOWANCE', label: 'Responsibility Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: false },
                    { componentCode: 'TELE_ALLOWANCE', label: 'Tele Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: false },
                    { componentCode: 'TAXABLE_TRANSPORT', label: 'Taxable Transport', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: false },
                    { componentCode: 'NON_TAXABLE_ALLOWANCE', label: 'Non-Taxable Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: false, required: false },
                    { componentCode: 'OT', label: 'Overtime', calculationType: 'HOURLY_RATE', defaultRate: 0, taxable: true, required: false },
                ],
                deductions: [
                    { componentCode: 'INCOME_TAX', label: 'Income Tax', calculationType: 'FORMULA', defaultValue: 0, enabled: true },
                    { componentCode: 'EMPLOYEE_PENSION', label: 'Employee Pension (7%)', calculationType: 'FORMULA', defaultValue: 0, enabled: true },
                    { componentCode: 'LOAN', label: 'Loan Deduction', calculationType: 'FIXED_AMOUNT', defaultValue: 0, enabled: true },
                    { componentCode: 'PENALTY', label: 'Penalty', calculationType: 'FIXED_AMOUNT', defaultValue: 0, enabled: true },
                    { componentCode: 'OTHER_DEDUCTIONS', label: 'Other Deductions', calculationType: 'FIXED_AMOUNT', defaultRate: 0, enabled: true },
                ],
                createdById: admin?._id || new mongoose_1.default.Types.ObjectId(),
            });
            console.log('[SEED] Default staff salary structure created');
        }
        const existingGuardStructure = await SalaryStructure_1.SalaryStructure.findOne({ employeeType: 'GUARD', isCurrent: true });
        if (!existingGuardStructure) {
            const admin = await User_1.User.findOne({ role: types_1.UserRole.SUPER_ADMIN });
            await SalaryStructure_1.SalaryStructure.create({
                name: 'Guard Standard',
                employeeType: 'GUARD',
                payBasis: 'HOURLY',
                version: 1,
                isCurrent: true,
                effectiveFrom: new Date('2024-01-01'),
                otMultiplier: 1.5,
                holidayMultiplier: 2.0,
                earnings: [
                    { componentCode: 'BASIC', label: 'Basic Salary (Monthly)', calculationType: 'FIXED_AMOUNT', defaultRate: 10800, taxable: true, required: true },
                    { componentCode: 'RESPONSIBILITY_ALLOWANCE', label: 'Responsibility Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: true, required: false },
                    { componentCode: 'TRANSPORT_ALLOWANCE', label: 'Transport Allowance', calculationType: 'FIXED_AMOUNT', defaultRate: 0, taxable: false, required: false },
                ],
                deductions: [
                    { componentCode: 'INCOME_TAX', label: 'Income Tax', calculationType: 'FORMULA', defaultValue: 0, enabled: true },
                    { componentCode: 'EMPLOYEE_PENSION', label: 'Employee Pension (7%)', calculationType: 'FORMULA', defaultValue: 0, enabled: true },
                    { componentCode: 'LOAN', label: 'Loan Deduction', calculationType: 'FIXED_AMOUNT', defaultValue: 0, enabled: true },
                ],
                createdById: admin?._id || new mongoose_1.default.Types.ObjectId(),
            });
            console.log('[SEED] Default guard salary structure created');
        }
        // --- Payroll Period ---
        const now = new Date();
        if (!(await PayrollPeriod_1.PayrollPeriod.findOne({ year: now.getFullYear(), month: now.getMonth() + 1 }))) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            await PayrollPeriod_1.PayrollPeriod.create({
                year: now.getFullYear(), month: now.getMonth() + 1, monthName: monthNames[now.getMonth()],
                startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                // End of the LAST day (23:59:59.999) so attendance on the final day is included
                endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
                status: types_1.PayrollPeriodStatus.OPEN,
            });
            console.log(`[SEED] Period: ${monthNames[now.getMonth()]} ${now.getFullYear()} (OPEN)`);
        }
        console.log('\n========================================');
        console.log('ALL USERS (password: password123)');
        console.log('========================================');
        console.log('Super Admin (read):  admin@vitalpayroll.com');
        console.log('System Admin:        sysadmin@vitalpayroll.com');
        console.log('HR:                  hr@vitalpayroll.com');
        console.log('Finance:             finance@vitalpayroll.com');
        console.log('Operations:          ops@vitalpayroll.com');
        console.log('Head:                head@vitalpayroll.com');
        console.log('Guard:               guard@vitalpayroll.com');
        console.log('========================================\n');
        process.exit(0);
    }
    catch (error) {
        console.error('[SEED] Error:', error);
        process.exit(1);
    }
}
seed();
//# sourceMappingURL=seed.js.map