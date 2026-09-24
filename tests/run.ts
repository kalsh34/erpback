import { runAll } from './harness';
import { registerTimeTests, registerBaseSequenceTests, registerSchedulerTests } from './engine.test';

async function main() {
  console.log('— time / rest —');
  registerTimeTests();
  console.log('— base sequence —');
  registerBaseSequenceTests();
  console.log('— scheduler / validator / stats —');
  registerSchedulerTests();
  const failed = await runAll();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
