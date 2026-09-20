const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB -> host=${mongoose.connection.host} db=${mongoose.connection.name}`);

  const hash = await bcrypt.hash('admin123', 12);

  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstName: String,
    lastName: String,
    role: String,
    employeeId: mongoose.Types.ObjectId,
    isActive: { type: Boolean, default: true },
  }, { timestamps: true });

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  const email = 'admin@vitalpayroll.com';
  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = hash;
    existing.role = 'SUPER_ADMIN';
    existing.isActive = true;
    await existing.save();
    console.log(`Updated admin user: ${existing.email} (${existing.role})`);
  } else {
    const admin = await User.create({
      email,
      password: hash,
      firstName: 'ERP',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    console.log(`Created admin user: ${admin.email} (${admin.role})`);
  }

  console.log(`Password: admin123`);
  console.log(`User ID: ${(existing || await User.findOne({ email }))._id}`);

  await mongoose.disconnect();
  console.log('Done');
}

createAdmin().catch(e => { console.error(e); process.exit(1); });
