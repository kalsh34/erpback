require('ts-node').register({ transpileOnly: true, project: './tsconfig.json' });

const { config } = require('./src/config/env');
const { connectDatabase } = require('./src/config/database');
const app = require('./src/app').default;

async function main() {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`Vital Security API running on http://localhost:${config.port}`);
  });
}

main();
