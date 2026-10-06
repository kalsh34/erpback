/**
 * Route registration check — no database needed.
 *
 * Imports the Express app (app.ts does NOT connect to Mongo) and walks the
 * mounted router stack to list every registered route. Fails if any route the
 * frontend calls is missing, which is exactly the "Route not found" symptom.
 *
 * Run: npm run check:routes
 */
import app from '../src/app';

interface RouteInfo {
  method: string;
  path: string;
}

function collectRoutes(): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const stack: any[] = (app as any)._router.stack || [];

  const walk = (layers: any[], prefix = '') => {
    for (const layer of layers) {
      if (layer.name === 'router' && layer.handle?.stack) {
        // Express 4 stores the string mount path on layer.path for app.use(str, router).
        const mount: string =
          typeof layer.path === 'string' && layer.path.length
            ? layer.path
            : String(layer.regexp?.source || '')
                .replace(/^\^/, '')
                .replace(/\\\//g, '/')
                .replace(/\/\?\(\?=.*$/, '')
                .replace(/\$$/, '');
        walk(layer.handle.stack, (prefix + mount).replace(/\/+$/, ''));
      } else if (layer.route) {
        const methods = Object.keys(layer.route.methods || {});
        for (const m of methods) {
          routes.push({ method: m.toUpperCase(), path: (prefix + layer.route.path).replace(/\/+$/, '') || '/' });
        }
      }
    }
  };

  walk(stack);
  return routes.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
}

const routes = collectRoutes();

console.log(`Registered ${routes.length} routes:\n`);
for (const r of routes) {
  console.log(`  ${r.method.padEnd(7)} ${r.path}`);
}

// Routes the frontend demonstrably calls (from frontend/src). The deployed
// backend 404s on all of these because it runs an old commit.
const mustExist: { method: string; path: string }[] = [
  { method: 'POST', path: '/api/auth/login' },
  { method: 'GET', path: '/api/companies/' },
  { method: 'GET', path: '/api/sites/' },
  { method: 'GET', path: '/api/employees/' },
  { method: 'GET', path: '/api/notifications/' },
  { method: 'POST', path: '/api/notifications/read-all' },
  { method: 'GET', path: '/api/module-reports/hr' },
  { method: 'GET', path: '/api/module-reports/sites' },
  { method: 'GET', path: '/api/module-reports/payroll' },
  { method: 'GET', path: '/api/staff-payroll/status' },
  { method: 'GET', path: '/api/staff-payroll/runs' },
  { method: 'GET', path: '/api/guard-payroll/runs' },
  { method: 'GET', path: '/api/payroll-common/tax-brackets' },
  { method: 'GET', path: '/api/payroll-common/pension-rules' },
  { method: 'GET', path: '/api/payroll-common/deductions' },
  { method: 'GET', path: '/api/departments/' },
  { method: 'GET', path: '/api/positions/' },
  { method: 'GET', path: '/api/pay-grades/' },
  { method: 'GET', path: '/api/attendance/shifts/my' },
  { method: 'GET', path: '/api/staff-attendance/grid' },
  { method: 'GET', path: '/api/staff-attendance/summary' },
  { method: 'GET', path: '/api/audit-logs/' },
  { method: 'GET', path: '/api/rotations/' },
];

const missing: string[] = [];
for (const need of mustExist) {
  // A mounted router at the prefix covers the sub-path; match on the prefix
  // for sub-routes (e.g. /api/module-reports covers /api/module-reports/hr).
  const prefix = need.path.replace(/\/[^/]*$/, '');
  const hit = routes.some(
    (r) =>
      r.method === need.method &&
      (r.path === need.path || r.path === prefix || need.path.startsWith(r.path + '/'))
  );
  if (!hit) missing.push(`${need.method} ${need.path}`);
}

if (missing.length) {
  console.error(`\nFAIL — ${missing.length} expected route(s) NOT registered:`);
  for (const m of missing) console.error(`  MISSING ${m}`);
  process.exit(1);
}

console.log(`\nPASS — all ${mustExist.length} frontend-critical routes are registered.`);
