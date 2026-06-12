import Submission from '../models/Submission.js';
import SubmissionTarget from '../models/SubmissionTarget.js';
import User from '../models/User.js';
import { startOfDay, endOfDay } from '../utils/dates.js';
import { logActivity } from '../utils/activity.js';
import { recalculatePerformance } from '../utils/performance.js';

const populateSubmission = (query) => query.populate('submittedBy', 'name email role avatar');

const syncTargetActual = async (userId, date = new Date()) => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const actual = await Submission.countDocuments({ submittedBy: userId, date: { $gte: dayStart, $lte: dayEnd } });

  await SubmissionTarget.findOneAndUpdate(
    { userId, date: dayStart },
    { actual },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const createSubmission = async (req, res) => {
  const { submittedBy, companyName, position, date, status, notes } = req.body;

  if (!companyName || !position) {
    return res.status(400).json({ message: 'Company and position are required' });
  }

  const ownerSelectedUser = submittedBy || req.user._id;
  const submitterId = req.user.role === 'owner' ? ownerSelectedUser : req.user._id;
  const submitter = await User.findById(submitterId);

  if (!submitter || submitter.role !== 'bidder') {
    return res.status(400).json({ message: 'Submission must belong to a bidder' });
  }

  if (req.user.role !== 'owner' && req.user.role !== 'bidder') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const submission = await Submission.create({
    submittedBy: submitterId,
    companyName,
    position,
    date,
    status,
    notes
  });

  await syncTargetActual(submitterId, submission.date);
  await recalculatePerformance(submitterId);
  await logActivity(req.user._id, `Logged submission for ${companyName}`, 'submission', submission._id);

  const populated = await populateSubmission(Submission.findById(submission._id));
  res.status(201).json(populated);
};

export const listSubmissions = async (req, res) => {
  if (!['owner', 'bidder'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const query = req.user.role === 'owner' ? {} : { submittedBy: req.user._id };
  const submissions = await populateSubmission(Submission.find(query)).sort({ date: -1 });
  res.json(submissions);
};

export const updateSubmissionStatus = async (req, res) => {
  const { status } = req.body;

  if (!['pending', 'response', 'rejected', 'interview'].includes(status)) {
    return res.status(400).json({ message: 'Invalid submission status' });
  }

  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ message: 'Submission not found' });
  }

  if (req.user.role !== 'owner' && !submission.submittedBy.equals(req.user._id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  submission.status = status;
  await submission.save();
  await recalculatePerformance(submission.submittedBy);
  await logActivity(req.user._id, `Updated submission ${submission._id} to ${status}`, 'submission', submission._id);

  const populated = await populateSubmission(Submission.findById(submission._id));
  res.json(populated);
};

export const getTargets = async (req, res) => {
  if (!['owner', 'bidder'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const date = req.query.date ? new Date(req.query.date) : new Date();
  const dayStart = startOfDay(date);

  const query = req.user.role === 'owner' ? { date: dayStart } : { userId: req.user._id, date: dayStart };
  const targets = await SubmissionTarget.find(query).populate('userId', 'name email role').sort({ date: -1 });

  res.json(targets);
};

export const setTarget = async (req, res) => {
  const { userId, date, target } = req.body;

  if (!userId || target === undefined) {
    return res.status(400).json({ message: 'User and target are required' });
  }

  const user = await User.findById(userId);
  if (!user || user.role !== 'bidder') {
    return res.status(400).json({ message: 'Targets can only be set for bidders' });
  }

  const dayStart = startOfDay(date ? new Date(date) : new Date());
  await syncTargetActual(userId, dayStart);

  const record = await SubmissionTarget.findOneAndUpdate(
    { userId, date: dayStart },
    { target },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('userId', 'name email role');

  res.status(201).json(record);
};
