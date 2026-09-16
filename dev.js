require('ts-node').register({ transpileOnly: true, project: './tsconfig.json' });

async function main() {
  try {
    console.log('Starting Vital Security Backend...');
    
    const { config } = require('./src/config/env');
    console.log('Config loaded:', { port: config.port, mongoUri: config.mongoUri });

    const { connectDatabase } = require('./src/config/database');
    console.log('Connecting to MongoDB...');
    await connectDatabase();
    console.log('MongoDB connected successfully');

    const app = require('./src/app').default;
    app.listen(config.port, () => {
      console.log(`[SERVER] Running on port ${config.port} in ${config.nodeEnv} mode`);
      console.log('READY');
    });
  } catch (error) {
    console.error('STARTUP ERROR:', error);
    process.exit(1);
  }
}

main();
