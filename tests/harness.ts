/**
 * Minimal dependency-free test harness (run via `npx ts-node tests/run.ts`).
 */

export type TestFn = () => void | Promise<void>;

interface Case {
  name: string;
  fn: TestFn;
}

const cases: Case[] = [];
let passed = 0;
let failed = 0;

export function test(name: string, fn: TestFn) {
  cases.push({ name, fn });
}

export function expect(cond: boolean, msg?: string): asserts cond {
  if (!cond) throw new Error(msg || 'assertion failed');
}

export function expectEq<T>(actual: T, expected: T, msg?: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg || 'expectEq failed'}\n  actual:   ${a}\n  expected: ${e}`);
  }
}

export async function runAll(): Promise<number> {
  for (const c of cases) {
    try {
      await c.fn();
      passed += 1;
      console.log(`  ✓ ${c.name}`);
    } catch (e: any) {
      failed += 1;
      console.log(`  ✗ ${c.name}`);
      console.log(`      ${e?.message || e}`);
    }
  }
  console.log('');
  console.log(`Result: ${passed} passed, ${failed} failed, ${cases.length} total`);
  return failed;
}
