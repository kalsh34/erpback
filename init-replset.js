const { MongoClient } = require('mongodb');
async function init() {
  // directConnection=true avoids the "waiting for primary" hang
  const client = new MongoClient('mongodb://127.0.0.1:27018/?directConnection=true', {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  await client.connect();
  const admin = client.db('admin').admin();
  const result = await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27018' }] } });
  console.log('OK', JSON.stringify(result));
  await client.close();
  process.exit(0);
}
init().catch(e => { console.log('ERR', e.message); process.exit(1); });
