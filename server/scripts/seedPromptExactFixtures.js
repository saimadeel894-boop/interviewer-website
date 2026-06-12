import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../models/User.js';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const PASSWORD = 'TestPass123!';
const args = new Set(process.argv.slice(2));
const confirmedDisposableDb = args.has('--confirm-disposable-db') || process.env.AUDIT_CONFIRM_DISPOSABLE_DB === 'true';

const USERS = [
  { role: 'owner', name: 'Test Owner', email: 'owner@test.com' },
  { role: 'developer', name: 'Audit Developer', email: 'dev@test.com' },
  { role: 'caller', name: 'Audit Caller', email: 'caller@test.com' },
  { role: 'bidder', name: 'Audit Bidder', email: 'bidder@test.com' }
];

const failSetup = (message) => {
  console.error(message);
  process.exit(1);
};

const requireEnvironment = () => {
  if (!process.env.MONGO_URI) {
    failSetup('Missing MONGO_URI in server/.env. Refusing to seed without a disposable test database.');
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    failSetup('Missing JWT_SECRET or JWT_REFRESH_SECRET in server/.env. The live server must use the same env values.');
  }

  if (!confirmedDisposableDb) {
    failSetup('Refusing to seed until --confirm-disposable-db is provided or AUDIT_CONFIRM_DISPOSABLE_DB=true is set.');
  }
};

const parseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async ({ method = 'GET', path, token, body }) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    return {
      status: response.status,
      body: await parseBody(response)
    };
  } catch (error) {
    return {
      status: 0,
      body: { message: error.message }
    };
  }
};

const assertServerReachable = async () => {
  const response = await request({ path: '/dashboard' });
  if (response.status === 0) {
    failSetup(`Live server is not reachable at ${API_BASE_URL}. Start/restart the server before running this seed step.`);
  }
};

const loginOwner = async () => {
  const response = await request({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'owner@test.com', password: PASSWORD }
  });

  if (response.status !== 200 || !response.body?.accessToken) {
    failSetup(`Owner login failed. Run first: npm run seed:owner -- "Test Owner" owner@test.com "${PASSWORD}". Actual: HTTP ${response.status} ${JSON.stringify(response.body)}`);
  }

  return response.body.accessToken;
};

const createRoleUsersViaApi = async (ownerToken) => {
  for (const user of USERS.filter((item) => item.role !== 'owner')) {
    const existing = await User.findOne({ email: user.email }).select('_id role');

    if (existing) {
      if (existing.role !== user.role) {
        failSetup(`${user.email} already exists with role ${existing.role}, expected ${user.role}.`);
      }
      continue;
    }

    const response = await request({
      method: 'POST',
      path: '/users',
      token: ownerToken,
      body: {
        name: user.name,
        email: user.email,
        password: PASSWORD,
        role: user.role,
        status: 'active'
      }
    });

    if (response.status !== 201) {
      failSetup(`Failed to create ${user.email} via /api/users. Actual: HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
  }
};

const printUserIds = async () => {
  const users = await User.find({ email: { $in: USERS.map((user) => user.email) } }).select('_id email role').sort({ role: 1 });
  const missing = USERS.filter((fixture) => !users.some((user) => user.email === fixture.email && user.role === fixture.role));

  if (missing.length) {
    failSetup(`Missing users after seed: ${missing.map((user) => `${user.email}/${user.role}`).join(', ')}`);
  }

  console.log('Prompt-exact fixture users confirmed in MongoDB:');
  console.log('| Role | Email | User ID |');
  console.log('| --- | --- | --- |');
  for (const fixture of USERS) {
    const user = users.find((item) => item.email === fixture.email && item.role === fixture.role);
    console.log(`| ${fixture.role} | ${fixture.email} | ${user._id.toString()} |`);
  }
};

const main = async () => {
  requireEnvironment();
  await assertServerReachable();
  await mongoose.connect(process.env.MONGO_URI);
  const ownerToken = await loginOwner();
  await createRoleUsersViaApi(ownerToken);
  await printUserIds();
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
