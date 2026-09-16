const mongoose = require('mongoose');

async function cleanup() {
  const uri = 'mongodb://127.0.0.1:27017/vitalpayroll';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const result = await mongoose.connection.db.collection('users').deleteMany({});
  console.log(`Deleted ${result.deletedCount} users`);

  const remaining = await mongoose.connection.db.collection('users').countDocuments();
  console.log(`Remaining users: ${remaining}`);

  await mongoose.disconnect();
  console.log('Done');
}

cleanup().catch(e => { console.error(e); process.exit(1); });
