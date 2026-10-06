/**
 * Site regression: optional gender split + deactivate cascades + deactivatedAt.
 * Run: npx ts-node --transpile-only tests\sites.check.ts
 * Requires MongoDB.
 */
import mongoose from 'mongoose';
import { config } from '../src/config/env';
import { Site } from '../src/models/Site';
import { Employee } from '../src/models/Employee';
import { PrimarySiteAssignment } from '../src/models/PrimarySiteAssignment';
import { SiteService } from '../src/modules/hr/sites/site.service';
import { EmployeeStatus } from '../src/types';

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log('OK:', msg); }
  else { failed++; console.error('FAIL:', msg); }
}

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log('DB connected');

  const suffix = Date.now() % 1000000;
  const site = await Site.create({
    siteName: `SiteCheck ${suffix}`,
    siteCode: `SC${suffix}`,
    location: 'Addis Ababa',
    siteType: 'RESIDENTIAL',
    status: 'ACTIVE',
    agreedManpower: 4,
    actualManpower: 3,
    maleCount: 2,
    femaleCount: 1,
  } as any);

  ok((site as any).maleCount === 2, 'maleCount stored');
  ok((site as any).femaleCount === 1, 'femaleCount stored');

  const siteNoGender = await Site.create({
    siteName: `SiteNoGender ${suffix}`,
    siteCode: `SG${suffix}`,
    location: 'Addis Ababa',
    siteType: 'COMMERCIAL',
    status: 'ACTIVE',
    agreedManpower: 1,
    actualManpower: 1,
  } as any);
  ok((siteNoGender as any).maleCount === undefined, 'maleCount optional (absent when not provided)');

  const guard = await Employee.create({
    firstName: 'Abebe',
    lastName: 'Kebede',
    employeeCode: `SCG${suffix}`,
    category: 'GUARD',
    status: EmployeeStatus.CONTRACTED,
  } as any);

  const assignment = await PrimarySiteAssignment.create({
    guardId: guard._id,
    siteId: site._id,
    role: 'GUARD',
    standardMonthlyHours: 240,
    hourlyRate: 30,
    effectiveFrom: new Date(),
    isCurrent: true,
  } as any);

  await SiteService.delete((site._id as any).toString(), { userId: new mongoose.Types.ObjectId().toString() });

  const after = await Site.findById(site._id);
  ok(after?.status === 'INACTIVE', `status INACTIVE (got ${after?.status})`);
  ok(!!(after as any)?.deactivatedAt, 'deactivatedAt recorded');

  const reloaded = await PrimarySiteAssignment.findById(assignment._id);
  ok(reloaded?.isCurrent === false, 'guard relieved (isCurrent=false)');
  ok(!!reloaded?.effectiveTo, 'effectiveTo set on relief');

  // History still available
  const history = await PrimarySiteAssignment.find({ siteId: site._id });
  ok(history.length === 1, 'assignment history kept for Guards tab');

  // Reactivate via update clears deactivatedAt
  await SiteService.update((site._id as any).toString(), { status: 'ACTIVE' } as any);
  const reactivated = await Site.findById(site._id);
  ok(reactivated?.status === 'ACTIVE', 'status ACTIVE after edit');
  ok(!(reactivated as any)?.deactivatedAt, 'deactivatedAt cleared on reactivate');

  // Cleanup
  await Site.deleteMany({ _id: { $in: [site._id, siteNoGender._id] } });
  await PrimarySiteAssignment.deleteMany({ siteId: site._id });
  await Employee.deleteOne({ _id: guard._id });

  await mongoose.disconnect();
  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
