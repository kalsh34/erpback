/**
 * Normal backend test command (DEF-L2 repair).
 *
 * The previous version imported `./harness` and `./engine.test`, neither of
 * which existed in the repository — MODULE_NOT_FOUND before anything ran.
 * It now drives the real harness (tests/harness.ts), which executes every
 * `tests/*.check.ts` regression suite in a child process and fails the run
 * when any suite exits non-zero, times out or crashes.
 *
 * Usage:
 *   npm test                       → run every discovered suite
 *   ts-node --transpile-only tests/run.ts sites staffPayrollEngine
 *                                  → run only the named suites
 */
import { runAll } from './harness';

async function main() {
  const requested = process.argv.slice(2);
  console.log(
    requested.length
      ? `Running requested suites: ${requested.join(', ')}`
      : 'Running all discovered check suites',
  );
  const failed = await runAll(requested.length ? requested : undefined);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
