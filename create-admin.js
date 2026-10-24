const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const uri = 'mongodb://127.0.0.1:27017/vitalpayroll';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const hash = await bcrypt.hash('admin123', 12);

  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstName: String,
    lastName: String,
    role: String,
    employeeId: mongoose.Types.ObjectId,
  }, { timestamps: true });

  const User = mongoose.model('User', userSchema);

  const admin = await User.create({
    email: 'admin@vitalpayroll.com',
    password: hash,
    firstName: 'ERP',
    lastName: 'Admin',
    role: 'HR_ADMIN',
    isActive: true,
  });

  console.log(`Created admin user: ${admin.email} (${admin.role})`);
  console.log(`Password: admin123`);
  console.log(`User ID: ${admin._id}`);

  await mongoose.disconnect();
  console.log('Done');
}

createAdmin().catch(e => { console.error(e); process.exit(1); });
