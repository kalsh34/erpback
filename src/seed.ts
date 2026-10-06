import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Employee } from './models/Employee';
import { GuardProfile } from './models/GuardProfile';
import { PrimarySiteAssignment } from './models/PrimarySiteAssignment';
import { Site } from './models/Site';
import { ShiftTemplate } from './models/ShiftTemplate';
import { ShiftAssignment } from './models/ShiftAssignment';
import { UserRole, EmployeeCategory, EmployeeStatus, GuardPosition, EmploymentType, ShiftAssignmentSource } from './types';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[SEED] Connected to MongoDB');

    const hash = await bcrypt.hash('password123', 12);

    const upsertUser = async (data: { email: string; firstName: string; lastName: string; role: UserRole; employeeId?: mongoose.Types.ObjectId }) => {
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        existing.password = hash;
        existing.firstName = data.firstName;
        existing.lastName = data.lastName;
        existing.role = data.role;
        if (data.employeeId) existing.employeeId = data.employeeId;
        await existing.save();
        console.log(`[SEED] Updated: ${data.email} (${data.role})`);
      } else {
        await User.create({ ...data, password: hash });
        console.log(`[SEED] Created: ${data.email} (${data.role})`);
      }
    };

    // --- Users (new role structure) ---
    await upsertUser({ email: 'admin@vitalpayroll.com', firstName: 'System', lastName: 'Admin', role: UserRole.SUPER_ADMIN });
    await upsertUser({ email: 'sysadmin@vitalpayroll.com', firstName: 'System', lastName: 'Admin', role: UserRole.SYSTEM_ADMIN });
    await upsertUser({ email: 'hr@vitalpayroll.com', firstName: 'Henok', lastName: 'Tadesse', role: UserRole.HR_ADMIN });
    await upsertUser({ email: 'finance@vitalpayroll.com', firstName: 'Fin', lastName: 'Officer', role: UserRole.FINANCE_OFFICER });
    await upsertUser({ email: 'ops@vitalpayroll.com', firstName: 'Ops', lastName: 'Manager', role: UserRole.OPERATIONS });
    await upsertUser({ email: 'head@vitalpayroll.com', firstName: 'Head', lastName: 'Officer', role: UserRole.HEAD });
    await upsertUser({ email: 'ceo@vitalpayroll.com', firstName: 'Chief', lastName: 'Executive', role: UserRole.CEO });

    // --- Guard Employee + User ---
    // Guards must be CONTRACTED to show up in guard payroll.
    let guardEmp = await Employee.findOne({ employeeCode: 'VSP-100' });
    if (!guardEmp) {
      guardEmp = await Employee.create({
        employeeCode: 'VSP-100', firstName: 'Abebe', lastName: 'Kebede',
        category: EmployeeCategory.GUARD, status: EmployeeStatus.CONTRACTED,
        hireDate: new Date('2023-06-15'), phone: '0911223344',
        guardInfo: { employmentType: EmploymentType.PERMANENT, idCardNumber: 'ID-001' },
      });
      await GuardProfile.create({ employeeId: guardEmp._id, position: GuardPosition.GUARD, employmentType: 'PERMANENT' });
      console.log('[SEED] Guard employee: VSP-100 Abebe Kebede (CONTRACTED)');
    } else if (guardEmp.status !== EmployeeStatus.CONTRACTED) {
      guardEmp.status = EmployeeStatus.CONTRACTED;
      await guardEmp.save();
      console.log('[SEED] Guard VSP-100 status -> CONTRACTED');
    }
    await upsertUser({ email: 'guard@vitalpayroll.com', firstName: 'Abebe', lastName: 'Kebede', role: UserRole.GUARD, employeeId: guardEmp._id });

    // --- Office Staff (for Finance to manage) ---
    const officeEmps = [
      { code: 'VSP-200', first: 'Berhanu', last: 'W/Giyorgis', phone: '0911223355' },
      { code: 'VSP-201', first: 'Terefe', last: 'Yadeta', phone: '0922334466' },
      { code: 'VSP-202', first: 'Rahel', last: 'Tadesse', phone: '0933445577' },
    ];
    for (const emp of officeEmps) {
      if (!(await Employee.findOne({ employeeCode: emp.code }))) {
        await Employee.create({ employeeCode: emp.code, firstName: emp.first, lastName: emp.last, category: EmployeeCategory.OFFICE_STAFF, hireDate: new Date('2022-01-15'), phone: emp.phone, position: 'Accountant' });
        console.log(`[SEED] Office: ${emp.code} ${emp.first} ${emp.last}`);
      }
    }

    // --- Sites ---
    const sitesData = [
      { code: 'VSP-HQ', name: 'Head Office', client: 'Vital Security', location: 'Addis Ababa, Bole', type: 'COMMERCIAL' as any, agreed: 15, actual: 12 },
      { code: 'VSP-DK', name: 'Dukem Factory', client: 'Dukem Industrial', location: 'Dukem, Oromia', type: 'INDUSTRIAL' as any, agreed: 20, actual: 18 },
      { code: 'VSP-MT', name: 'Metehara Farm', client: 'Metehara Agro', location: 'Metehara, Amhara', type: 'INDUSTRIAL' as any, agreed: 12, actual: 10 },
      { code: 'VSP-AD', name: 'Adama Mall', client: 'Adama Retail', location: 'Adama, Oromia', type: 'COMMERCIAL' as any, agreed: 10, actual: 8 },
    ];
    for (const s of sitesData) {
      if (!(await Site.findOne({ siteCode: s.code }))) {
        await Site.create({ siteCode: s.code, siteName: s.name, client: s.client, location: s.location, siteType: s.type, agreedManpower: s.agreed, actualManpower: s.actual });
        console.log(`[SEED] Site: ${s.code} - ${s.name}`);
      }
    }

    // --- Assign guard to HQ site ---
    if (guardEmp) {
      const hqSite = await Site.findOne({ siteCode: 'VSP-HQ' });
      if (hqSite && !(await PrimarySiteAssignment.findOne({ guardId: guardEmp._id, isCurrent: true }))) {
        await PrimarySiteAssignment.create({ guardId: guardEmp._id, siteId: hqSite._id, standardMonthlyHours: 240, hourlyRate: 26.63, effectiveFrom: new Date('2024-01-01'), isCurrent: true });
        console.log('[SEED] Guard VSP-100 -> VSP-HQ (240 hrs, 26.63 ETB/hr)');
      }

      // --- Shift assignment (the standard day template used by the roster) ---
      if (hqSite) {
        let template = await ShiftTemplate.findOne({ name: 'Standard Day (06:00-18:00)' });
        if (!template) {
          template = await ShiftTemplate.create({
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
        const admin = await User.findOne({ role: UserRole.SUPER_ADMIN });
        if (!(await ShiftAssignment.findOne({ guardId: guardEmp._id, siteId: hqSite._id, status: 'ACTIVE' }))) {
          await ShiftAssignment.create({
            guardId: guardEmp._id,
            siteId: hqSite._id,
            shiftTemplateId: template._id,
            startDate: new Date('2024-01-01'),
            status: 'ACTIVE',
            source: ShiftAssignmentSource.MANUAL,
            assignedById: admin?._id || guardEmp._id,
          });
          console.log('[SEED] Shift assignment: VSP-100 -> VSP-HQ (ACTIVE, from 2024-01-01)');
        }
      }
    }

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
  } catch (error) {
    console.error('[SEED] Error:', error);
    process.exit(1);
  }
}

seed();
