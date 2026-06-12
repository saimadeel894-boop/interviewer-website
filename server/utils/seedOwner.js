import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Profile from '../models/Profile.js';

dotenv.config();

const [, , name = 'Owner', email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: npm run seed:owner -- "Owner Name" owner@example.com password');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is required');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const existingOwner = await User.findOne({ role: 'owner' });
if (existingOwner) {
  console.error(`Owner already exists: ${existingOwner.email}`);
  process.exit(1);
}

const owner = await User.create({ name, email, password, role: 'owner' });
await Profile.create({ userId: owner._id });

console.log(`Owner created: ${owner.email}`);
await mongoose.disconnect();
