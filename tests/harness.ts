/**
 * TEST HARNESS (DEF-L2 repair)
 *
 * backend/tests/run.ts used to import a `./harness` module plus an
 * `./engine.test` file that were never committed, so the normal test command
 * crashed with MODULE_NOT_FOUND before any suite ran. This module provides the
 * missing harness: it discovers the backend regression suites (`*.check.ts`
 * files in this directory), runs each one in a child process and aggregates
 * their exit codes.
 *
 * Contract — never masks a failure:
 *   - a suite counts as PASSED only when its process exits 0.
 *   - a crash/timeout/module-error counts as the suite FAILED, not skipped.
 *   - runAll() returns the number of FAILED suites; run.ts exits non-zero when
 *     that number is > 0. Passing suites are never reported for suites that
 *     were not executed.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const TESTS_DIR = __dirname;
const BACKEND_ROOT = path.join(TESTS_DIR, '..');

/**
 * Files that are helpers/finals rather than self-contained suites:
 *  - guardE2eServer.ts / guardAuditServer.ts: server fixtures imported by suites
 *  - *.cjs: legacy API suites that need an EXTERNAL running server + fixture
 *  - guardReconcile.check.ts: an evidence EXTRACTOR (writes a Documentation
 *    file); it makes no pass/fail assertions, so running it as a suite would
 *    turn a successful extraction into a "failure".
 *  - guardWorkflowApi.check.ts: DEPENDENT suite — it reads the
 *    ../.guard-audit/database.json written by guardWorkflow.check.ts AND
 *    requires a pre-booted API server on port 5018 (no committed script boots
 *    one). Excluded from default discovery; it can still be run explicitly by
 *    name inside an externally orchestrated guardWorkflow round-trip.
 */
const EXCLUDED_FILES = new Set([
  'guardE2eServer.ts',
  'guardAuditServer.ts',
  'guardE2eReconcile.cjs',
  'guardE2eApi.check.cjs',
  'guardReconcile.check.ts',
]);
const EXCLUDED_FROM_DEFAULT_DISCOVERY = new Set<string>([
  'guardWorkflowApi.check.ts',
]);

const RUN_TIMEOUT_MS = 10 * 60 * 1000; // 10 min per suite, hardened against hangs

export function discoverSuites(): string[] {
  return fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith('.check.ts')
      && !EXCLUDED_FILES.has(f)
      && !EXCLUDED_FROM_DEFAULT_DISCOVERY.has(f))
    .sort();
}

interface SuiteResult {
  name: string;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
}

function runSuite(name: string): Promise<SuiteResult> {
  return new Promise((resolve) => {
    let timedOut = false;
    const child = spawn(
      process.execPath,
      ['-r', 'ts-node/register/transpile-only', path.join(TESTS_DIR, name)],
      { cwd: BACKEND_ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += String(d); });
    child.stderr.on('data', (d) => { stderr += String(d); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, RUN_TIMEOUT_MS);

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ name, exitCode: null, timedOut, stdout, stderr: stderr + `\n(spawn error: ${err.message})` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ name, exitCode: code, timedOut, stdout, stderr });
    });
  });
}

/**
 * Runs the given suites (basenames, without extension — e.g. `sites`) or all
 * discovered ones when no argument is given. Returns the number of failures.
 */
export async function runAll(requested?: string[]): Promise<number> {
  let suites: string[];
  if (requested && requested.length) {
    // Explicit names may force-run a suite excluded from default discovery.
    const all = discoverSuites();
    suites = requested.map((r) => {
      const base = r.replace(/\.check\.ts$/, '');
      const match = all.find((s) => s === base || s === `${base}.check.ts`)
        ?? (fs.existsSync(path.join(TESTS_DIR, `${base}.check.ts`))
          ? `${base}.check.ts`
          : undefined);
      if (!match) throw new Error(`Unknown suite '${r}' — available: ${all.join(', ')}`);
      return match;
    });
  } else {
    suites = discoverSuites();
  }

  const results: SuiteResult[] = [];
  for (const name of suites) {
    console.log(`\n=== SUITE ${name} — running…`);
    const result = await runSuite(name);
    results.push(result);
    console.log(`\n=== SUITE ${name} — ${result.timedOut || result.exitCode !== 0 ? 'FAIL' : 'PASS'} (exit ${result.timedOut ? 'TIMEOUT' : result.exitCode})`);
    if (result.stdout.trim()) console.log(result.stdout.trimEnd());
    if (result.stderr.trim()) console.error(result.stderr.trimEnd());
  }

  const passed = results.filter((r) => !r.timedOut && r.exitCode === 0);
  const failed = results.filter((r) => r.timedOut || r.exitCode !== 0);

  console.log('\n==================== TEST RUN SUMMARY ====================');
  for (const r of passed) console.log(`  PASS   ${r.name}`);
  for (const r of failed) console.log(`  FAIL   ${r.name} (${r.timedOut ? 'TIMEOUT' : `exit ${r.exitCode}`})`);
  console.log(`----------------------------------------------------------`);
  console.log(`  Suites: ${results.length}  ·  passed: ${passed.length}  ·  failed: ${failed.length}`);
  console.log('==========================================================');

  return failed.length;
}
