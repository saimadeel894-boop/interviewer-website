import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { io } from 'socket.io-client';

import ActivityLog from '../models/ActivityLog.js';
import Interview from '../models/Interview.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import Profile from '../models/Profile.js';
import Submission from '../models/Submission.js';
import SubmissionTarget from '../models/SubmissionTarget.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');
const PASSWORD = 'TestPass123!';
const FIXTURES = [
  { role: 'owner', name: 'Audit Owner', email: 'owner@test.com' },
  { role: 'developer', name: 'Audit Developer', email: 'dev@test.com' },
  { role: 'caller', name: 'Audit Caller', email: 'caller@test.com' },
  { role: 'bidder', name: 'Audit Bidder', email: 'bidder@test.com' }
];

const args = new Set(process.argv.slice(2));
const confirmedDisposableDb = args.has('--confirm-disposable-db') || process.env.AUDIT_CONFIRM_DISPOSABLE_DB === 'true';
const useExistingFixtures = args.has('--use-existing-fixtures');
const cleanRelatedFixtures = !args.has('--keep-related-fixtures');
const rows = [];
const ids = {};
const tokens = {};
const needsOwnerDecisions = [];

const escapeCell = (value) => String(value)
  .replaceAll('|', '\\|')
  .replaceAll('\r', ' ')
  .replaceAll('\n', '<br>');

const compact = (value) => {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const addRow = ({ test, expected, actual, pass, fix = 'No' }) => {
  rows.push({
    test,
    expected,
    actual,
    status: pass ? 'PASS' : 'FAIL',
    fix
  });
};

const failSetup = (message) => {
  console.error(message);
  process.exit(1);
};

const requireEnvironment = () => {
  if (!process.env.MONGO_URI) {
    failSetup('Missing MONGO_URI in server/.env. Refusing to run live audit without a disposable test database.');
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    failSetup('Missing JWT_SECRET or JWT_REFRESH_SECRET in server/.env. The live server must use the same env values.');
  }

  if (!confirmedDisposableDb) {
    failSetup('Refusing to reset fixture data until --confirm-disposable-db is provided or AUDIT_CONFIRM_DISPOSABLE_DB=true is set.');
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

const actualOf = (response) => `HTTP ${response.status} ${compact(response.body)}`;

const isObjectIdEqual = (value, expected) => {
  const id = value?._id || value?.id || value;
  return id?.toString() === expected?.toString();
};

const hasNoBonusFields = (payments) => Array.isArray(payments) && payments.every((payment) => (
  !Object.prototype.hasOwnProperty.call(payment, 'bonus')
  && !Object.prototype.hasOwnProperty.call(payment, 'bonusReason')
));

const currentMonth = () => new Date().toISOString().slice(0, 7);

const previousMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 7);
};

const deleteRelatedFixtureData = async (userIds) => {
  const [tasks, interviews, submissions, payments, messages, notifications] = await Promise.all([
    Task.find({ $or: [{ assignedTo: { $in: userIds } }, { createdBy: { $in: userIds } }] }).select('_id'),
    Interview.find({ assignedCaller: { $in: userIds } }).select('_id'),
    Submission.find({ submittedBy: { $in: userIds } }).select('_id'),
    Payment.find({ userId: { $in: userIds } }).select('_id'),
    Message.find({ $or: [{ senderId: { $in: userIds } }, { receiverId: { $in: userIds } }] }).select('_id'),
    Notification.find({ userId: { $in: userIds } }).select('_id')
  ]);

  const relatedIds = [
    ...userIds,
    ...tasks.map((item) => item._id),
    ...interviews.map((item) => item._id),
    ...submissions.map((item) => item._id),
    ...payments.map((item) => item._id),
    ...messages.map((item) => item._id),
    ...notifications.map((item) => item._id)
  ];

  await Promise.all([
    Task.deleteMany({ $or: [{ assignedTo: { $in: userIds } }, { createdBy: { $in: userIds } }] }),
    Interview.deleteMany({ assignedCaller: { $in: userIds } }),
    Submission.deleteMany({ submittedBy: { $in: userIds } }),
    SubmissionTarget.deleteMany({ userId: { $in: userIds } }),
    Message.deleteMany({ $or: [{ senderId: { $in: userIds } }, { receiverId: { $in: userIds } }] }),
    Payment.deleteMany({ userId: { $in: userIds } }),
    Notification.deleteMany({ userId: { $in: userIds } }),
    ActivityLog.deleteMany({ $or: [{ userId: { $in: userIds } }, { entityId: { $in: relatedIds } }] })
  ]);
};

const resetAndSeedUsers = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const fixtureEmails = FIXTURES.map((fixture) => fixture.email);
  const oldUsers = await User.find({ email: { $in: fixtureEmails } }).select('_id');
  const oldUserIds = oldUsers.map((user) => user._id);

  await deleteRelatedFixtureData(oldUserIds);
  await Profile.deleteMany({ userId: { $in: oldUserIds } });

  await User.deleteMany({ email: { $in: fixtureEmails } });

  for (const fixture of FIXTURES) {
    const user = await User.create({
      ...fixture,
      password: PASSWORD,
      status: 'active'
    });

    await Profile.create({ userId: user._id });
    ids[fixture.role] = user._id.toString();
  }

  await mongoose.disconnect();
};

const loadExistingFixtureUsers = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({ email: { $in: FIXTURES.map((fixture) => fixture.email) } }).select('_id email role');
  const missing = FIXTURES.filter((fixture) => !users.some((user) => user.email === fixture.email && user.role === fixture.role));

  if (missing.length) {
    await mongoose.disconnect();
    failSetup(`Missing seeded fixture users: ${missing.map((fixture) => `${fixture.email}/${fixture.role}`).join(', ')}. Run seed:owner and seed:audit-fixtures first.`);
  }

  for (const fixture of FIXTURES) {
    const user = users.find((item) => item.email === fixture.email && item.role === fixture.role);
    ids[fixture.role] = user._id.toString();
  }

  if (cleanRelatedFixtures) {
    await deleteRelatedFixtureData(users.map((user) => user._id));
  }

  await mongoose.disconnect();
};

const assertServerReachable = async () => {
  const response = await request({ path: '/dashboard' });
  if (response.status === 0) {
    failSetup(`Live server is not reachable at ${API_BASE_URL}. Start/restart the server with server/.env loaded before running this audit.`);
  }
};

const loginFixtures = async () => {
  for (const fixture of FIXTURES) {
    const response = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: fixture.email, password: PASSWORD }
    });

    const pass = response.status === 200 && Boolean(response.body?.accessToken);
    addRow({
      test: `Login as ${fixture.role}`,
      expected: 'HTTP 200 with accessToken',
      actual: actualOf(response),
      pass
    });

    if (!pass) {
      printReport();
      failSetup(`Login failed for ${fixture.email}; cannot continue audit.`);
    }

    tokens[fixture.role] = response.body.accessToken;
  }
};

const createPaymentStripFixtures = async () => {
  const month = previousMonth();

  for (const role of ['developer', 'caller', 'bidder']) {
    await request({
      method: 'POST',
      path: '/payments',
      token: tokens.owner,
      body: {
        userId: ids[role],
        month,
        baseSalary: 1000,
        bonus: 999,
        bonusReason: 'strip-check'
      }
    });
  }
};

const runPermissionMatrix = async () => {
  for (const role of ['developer', 'caller', 'bidder']) {
    const token = tokens[role];

    let response = await request({ path: '/users', token });
    addRow({
      test: `${role} GET /api/users`,
      expected: 'HTTP 403',
      actual: actualOf(response),
      pass: response.status === 403
    });

    response = await request({ path: '/dashboard', token });
    addRow({
      test: `${role} GET /api/dashboard`,
      expected: 'HTTP 403',
      actual: actualOf(response),
      pass: response.status === 403
    });

    response = await request({ path: '/tasks', token });
    addRow({
      test: `${role} GET /api/tasks`,
      expected: role === 'developer' ? 'HTTP 200 own tasks only' : 'HTTP 403 or HTTP 200 []',
      actual: actualOf(response),
      pass: role === 'developer'
        ? response.status === 200 && Array.isArray(response.body) && response.body.every((task) => isObjectIdEqual(task.assignedTo, ids.developer))
        : response.status === 403 || (response.status === 200 && Array.isArray(response.body) && response.body.length === 0)
    });

    response = await request({ path: '/interviews', token });
    addRow({
      test: `${role} GET /api/interviews`,
      expected: role === 'caller' ? 'HTTP 200 own interviews only' : 'HTTP 403 or HTTP 200 []',
      actual: actualOf(response),
      pass: role === 'caller'
        ? response.status === 200 && Array.isArray(response.body) && response.body.every((interview) => isObjectIdEqual(interview.assignedCaller, ids.caller))
        : response.status === 403 || (response.status === 200 && Array.isArray(response.body) && response.body.length === 0)
    });

    response = await request({ path: '/submissions', token });
    addRow({
      test: `${role} GET /api/submissions`,
      expected: role === 'bidder' ? 'HTTP 200 own submissions only' : 'HTTP 403 or HTTP 200 []',
      actual: actualOf(response),
      pass: role === 'bidder'
        ? response.status === 200 && Array.isArray(response.body) && response.body.every((submission) => isObjectIdEqual(submission.submittedBy, ids.bidder))
        : response.status === 403 || (response.status === 200 && Array.isArray(response.body) && response.body.length === 0)
    });

    response = await request({ path: '/logs', token });
    addRow({
      test: `${role} GET /api/logs`,
      expected: 'HTTP 403',
      actual: actualOf(response),
      pass: response.status === 403
    });

    response = await request({
      method: 'PUT',
      path: '/settings',
      token,
      body: { currency: 'USD' }
    });
    addRow({
      test: `${role} PUT /api/settings`,
      expected: 'HTTP 403',
      actual: actualOf(response),
      pass: response.status === 403
    });

    response = await request({ path: '/payments', token });
    addRow({
      test: `${role} GET /api/payments strips bonus fields`,
      expected: 'HTTP 200 own payment data, no bonus/bonusReason',
      actual: actualOf(response),
      pass: response.status === 200
        && Array.isArray(response.body)
        && response.body.length >= 1
        && hasNoBonusFields(response.body)
    });
  }
};

const runTaskTests = async () => {
  let response = await request({
    method: 'POST',
    path: '/tasks',
    token: tokens.owner,
    body: {
      title: 'Audit transition task',
      description: 'Used by verification audit',
      assignedTo: ids.developer
    }
  });
  const taskId = response.body?._id;
  addRow({
    test: 'Owner creates task for developer',
    expected: 'HTTP 201 with assigned task',
    actual: actualOf(response),
    pass: response.status === 201 && taskId && isObjectIdEqual(response.body.assignedTo, ids.developer)
  });

  response = await request({
    method: 'PATCH',
    path: `/tasks/${taskId}/status`,
    token: tokens.developer,
    body: { status: 'completed' }
  });
  addRow({
    test: 'Developer direct assigned -> completed',
    expected: 'Blocked with HTTP 400/403',
    actual: actualOf(response),
    pass: response.status === 400 || response.status === 403
  });

  response = await request({
    method: 'PATCH',
    path: `/tasks/${taskId}/status`,
    token: tokens.developer,
    body: { status: 'in_progress' }
  });
  addRow({
    test: 'Developer assigned -> in_progress',
    expected: 'HTTP 200 status=in_progress',
    actual: actualOf(response),
    pass: response.status === 200 && response.body?.status === 'in_progress'
  });

  response = await request({
    method: 'PUT',
    path: `/tasks/${taskId}`,
    token: tokens.developer,
    body: { title: 'Developer should not edit this' }
  });
  addRow({
    test: 'Developer PUT /api/tasks/:id',
    expected: 'HTTP 403',
    actual: actualOf(response),
    pass: response.status === 403
  });
};

const connectSocket = (token) => new Promise((resolve, reject) => {
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    timeout: 5000
  });

  socket.once('connect', () => resolve(socket));
  socket.once('connect_error', reject);
});

const runChatTests = async () => {
  let response = await request({
    method: 'POST',
    path: `/messages/${ids.bidder}`,
    token: tokens.caller,
    body: { content: 'caller to bidder should fail' }
  });
  addRow({
    test: 'REST chat caller -> bidder',
    expected: 'HTTP 403 rejected',
    actual: actualOf(response),
    pass: response.status === 403
  });

  response = await request({
    method: 'POST',
    path: `/messages/${ids.owner}`,
    token: tokens.caller,
    body: { content: 'caller to owner should succeed' }
  });
  addRow({
    test: 'REST chat caller -> owner',
    expected: 'HTTP 201 message created',
    actual: actualOf(response),
    pass: response.status === 201 && response.body?.content === 'caller to owner should succeed'
  });

  let callerSocket;
  let bidderSocket;
  let delivered = false;
  let acknowledgement = null;

  try {
    bidderSocket = await connectSocket(tokens.bidder);
    bidderSocket.on('receive_message', () => {
      delivered = true;
    });

    callerSocket = await connectSocket(tokens.caller);
    acknowledgement = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ timeout: true }), 3000);
      callerSocket.emit('send_message', {
        receiverId: ids.bidder,
        content: 'socket caller to bidder should fail'
      }, (ack) => {
        clearTimeout(timeout);
        resolve(ack);
      });
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  } catch (error) {
    acknowledgement = { error: error.message };
  } finally {
    callerSocket?.disconnect();
    bidderSocket?.disconnect();
  }

  addRow({
    test: 'Socket chat caller -> bidder',
    expected: 'Acknowledged error and not delivered',
    actual: compact({ acknowledgement, delivered }),
    pass: Boolean(acknowledgement?.error) && delivered === false
  });
};

const runInterviewTests = async () => {
  let response = await request({
    method: 'POST',
    path: '/interviews',
    token: tokens.caller,
    body: {
      candidateName: 'Caller Created Candidate',
      candidateEmail: 'caller-created@example.com',
      position: 'Engineer',
      company: 'Audit Co',
      assignedCaller: ids.caller
    }
  });
  addRow({
    test: 'Caller POST /api/interviews (step 7.1)',
    expected: 'Observe actual create behavior',
    actual: actualOf(response),
    pass: response.status === 201 || response.status === 403
  });

  let interviewId = response.body?._id;

  if (response.status === 201) {
    addRow({
      test: 'Caller-created interview default stage',
      expected: 'HTTP 201 currentStage=recruiter',
      actual: actualOf(response),
      pass: response.body?.currentStage === 'recruiter'
    });
  } else {
    needsOwnerDecisions.push('Interview creation ownership: verification step 7 asks caller to create an interview, but the current API rejected caller create. Decide whether to keep owner-only creation from the original build spec or allow callers to create assigned interviews.');

    response = await request({
      method: 'POST',
      path: '/interviews',
      token: tokens.owner,
      body: {
        candidateName: 'Offer Candidate',
        candidateEmail: 'offer@example.com',
        position: 'Engineer',
        company: 'Audit Co',
        assignedCaller: ids.caller
      }
    });
    interviewId = response.body?._id;
    addRow({
      test: 'Owner creates interview fallback for stage-jump check',
      expected: 'HTTP 201 currentStage=recruiter',
      actual: actualOf(response),
      pass: response.status === 201 && response.body?.currentStage === 'recruiter'
    });
  }

  response = await request({
    method: 'PATCH',
    path: `/interviews/${interviewId}/stage`,
    token: tokens.caller,
    body: { stage: 'offer', notes: 'Direct jump observation for owner decision', status: 'passed' }
  });
  const stageJumpAllowed = response.status === 200 && response.body?.currentStage === 'offer';
  const stageJumpBlocked = response.status === 400 || response.status === 403;
  const stageJumpOutcome = stageJumpAllowed ? 'ALLOWED' : stageJumpBlocked ? 'BLOCKED' : 'UNEXPECTED';

  needsOwnerDecisions.push(`Interview stage progression: direct recruiter -> offer jump was ${stageJumpOutcome}. Decide whether stage order should be enforced or free-jump should remain allowed.`);

  addRow({
    test: 'Caller direct recruiter -> offer stage jump',
    expected: 'Observe ALLOWED/BLOCKED and flag owner decision',
    actual: `${actualOf(response)} => ${stageJumpOutcome}`,
    pass: stageJumpAllowed || stageJumpBlocked
  });
};

const createCompletedTask = async (index) => {
  const created = await request({
    method: 'POST',
    path: '/tasks',
    token: tokens.owner,
    body: {
      title: `Audit bonus task ${index}`,
      description: 'Used by bonus calculation audit',
      assignedTo: ids.developer
    }
  });

  if (created.status !== 201 || !created.body?._id) return created;

  return request({
    method: 'PATCH',
    path: `/tasks/${created.body._id}/status`,
    token: tokens.owner,
    body: { status: 'completed' }
  });
};

const createOfferInterview = async () => {
  const created = await request({
    method: 'POST',
    path: '/interviews',
    token: tokens.owner,
    body: {
      candidateName: 'Bonus Offer Candidate',
      candidateEmail: 'bonus.offer@example.com',
      position: 'Engineer',
      company: 'Bonus Audit Co',
      assignedCaller: ids.caller
    }
  });

  if (created.status !== 201 || !created.body?._id) return created;

  return request({
    method: 'PATCH',
    path: `/interviews/${created.body._id}/stage`,
    token: tokens.owner,
    body: { stage: 'offer', notes: 'Bonus calculation fixture', status: 'passed' }
  });
};

const runBonusTests = async () => {
  let response = await request({
    method: 'PUT',
    path: '/settings',
    token: tokens.owner,
    body: {
      bonusRates: {
        developerPerTask: 50,
        callerPerOffer: 100,
        bidderPerResponse: 10
      }
    }
  });
  addRow({
    test: 'Owner sets bonus rates',
    expected: 'HTTP 200 persisted rates developer=50, caller=100, bidder=10 before calculations',
    actual: actualOf(response),
    pass: response.status === 200
      && response.body?.bonusRates?.developerPerTask === 50
      && response.body?.bonusRates?.callerPerOffer === 100
      && response.body?.bonusRates?.bidderPerResponse === 10
  });

  const completedTasks = await Promise.all([createCompletedTask(1), createCompletedTask(2)]);
  addRow({
    test: 'Developer bonus setup completed tasks',
    expected: '2 completed tasks',
    actual: compact(completedTasks.map((item) => ({ status: item.status, taskStatus: item.body?.status, id: item.body?._id }))),
    pass: completedTasks.every((item) => item.status === 200 && item.body?.status === 'completed')
  });

  response = await request({
    method: 'POST',
    path: `/payments/calculate/${ids.developer}`,
    token: tokens.owner,
    body: { month: currentMonth(), baseSalary: 0 }
  });
  addRow({
    test: 'Developer bonus calculation',
    expected: 'HTTP 200 bonus=100 from 2 completed tasks * 50',
    actual: actualOf(response),
    pass: response.status === 200 && response.body?.bonus === 100
  });

  const offerInterview = await createOfferInterview();
  addRow({
    test: 'Caller bonus setup offer',
    expected: '1 interview moved to offer',
    actual: compact({ status: offerInterview.status, currentStage: offerInterview.body?.currentStage, id: offerInterview.body?._id }),
    pass: offerInterview.status === 200 && offerInterview.body?.currentStage === 'offer'
  });

  response = await request({
    method: 'POST',
    path: `/payments/calculate/${ids.caller}`,
    token: tokens.owner,
    body: { month: currentMonth(), baseSalary: 0 }
  });
  addRow({
    test: 'Caller bonus calculation',
    expected: 'HTTP 200 bonus=100 from 1 offer * 100',
    actual: actualOf(response),
    pass: response.status === 200 && response.body?.bonus === 100
  });

  const submissions = [];
  for (const index of [1, 2]) {
    submissions.push(await request({
      method: 'POST',
      path: '/submissions',
      token: tokens.bidder,
      body: {
        companyName: `Response Company ${index}`,
        position: 'Engineer',
        status: 'response',
        notes: 'Bonus calculation fixture'
      }
    }));
  }
  addRow({
    test: 'Bidder bonus setup responses',
    expected: '2 response submissions',
    actual: compact(submissions.map((item) => ({ status: item.status, submissionStatus: item.body?.status, id: item.body?._id }))),
    pass: submissions.every((item) => item.status === 201 && item.body?.status === 'response')
  });

  response = await request({
    method: 'POST',
    path: `/payments/calculate/${ids.bidder}`,
    token: tokens.owner,
    body: { month: currentMonth(), baseSalary: 0 }
  });
  addRow({
    test: 'Bidder bonus calculation',
    expected: 'HTTP 200 bonus=20 from 2 responses * 10',
    actual: actualOf(response),
    pass: response.status === 200 && response.body?.bonus === 20
  });
};

const printReport = () => {
  const idRows = FIXTURES.map((fixture) => `| ${fixture.role} | ${fixture.email} | ${ids[fixture.role] || ''} |`).join('\n');
  const resultRows = rows.map((row) => (
    `| ${escapeCell(row.test)} | ${escapeCell(row.expected)} | ${escapeCell(row.actual)} | ${row.status} | ${escapeCell(row.fix)} |`
  )).join('\n');
  const failures = rows.filter((row) => row.status === 'FAIL').length;
  const decisionRows = needsOwnerDecisions.length
    ? needsOwnerDecisions.map((decision) => `- ${decision}`).join('\n')
    : 'None.';

  console.log(`# Permission & Business Logic Verification Report

## Fixture User IDs
| Role | Email | User ID |
| --- | --- | --- |
${idRows}

## Results
| Test | Expected | Actual | Status (PASS/FAIL) | Fix Applied? |
| --- | --- | --- | --- | --- |
${resultRows}

## Needs Owner Decision
${decisionRows}

## Summary
${rows.length - failures} passed, ${failures} failed.

## Cleanup Note
Fixture users and generated verification records are left in the test database for manual testing.
`);
};

const main = async () => {
  requireEnvironment();
  if (useExistingFixtures) {
    await loadExistingFixtureUsers();
  } else {
    await resetAndSeedUsers();
  }
  await assertServerReachable();
  await loginFixtures();
  await createPaymentStripFixtures();
  await runPermissionMatrix();
  await runTaskTests();
  await runChatTests();
  await runInterviewTests();
  await runBonusTests();
  printReport();

  const failed = rows.some((row) => row.status === 'FAIL');
  process.exit(failed ? 1 : 0);
};

main().catch(async (error) => {
  console.error(error);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
