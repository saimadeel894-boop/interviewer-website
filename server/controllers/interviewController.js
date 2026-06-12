import Interview from '../models/Interview.js';
import User from '../models/User.js';
import { logActivity } from '../utils/activity.js';
import { createNotification } from '../utils/notifications.js';
import { recalculatePerformance } from '../utils/performance.js';

const stageOrder = ['recruiter', 'hr', 'technical_1', 'technical_2', 'technical_3', 'final', 'offer'];
const stages = [...stageOrder, 'rejected'];

const populateInterview = (query) => query.populate('assignedCaller', 'name email role avatar');

const ensureInterviewAccess = (req, interview) => {
  const isOwner = req.user.role === 'owner';
  const isAssignedCaller = req.user.role === 'caller' && interview.assignedCaller._id.equals(req.user._id);

  if (!isOwner && !isAssignedCaller) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
};

export const createInterview = async (req, res) => {
  const { candidateName, candidateEmail, position, company, assignedCaller, currentStage } = req.body;

  if (!candidateName || !candidateEmail || !position || !company || !assignedCaller) {
    return res.status(400).json({ message: 'Candidate, position, company, and caller are required' });
  }

  const caller = await User.findById(assignedCaller);
  if (!caller || caller.role !== 'caller') {
    return res.status(400).json({ message: 'Interview can only be assigned to a caller' });
  }

  const interview = await Interview.create({
    candidateName,
    candidateEmail,
    position,
    company,
    assignedCaller,
    currentStage: currentStage || 'recruiter',
    stages: [{ stage: currentStage || 'recruiter', date: new Date(), status: 'pending' }]
  });

  await logActivity(req.user._id, `Created interview for ${candidateName}`, 'interview', interview._id);
  await recalculatePerformance(caller._id);

  const populated = await populateInterview(Interview.findById(interview._id));
  res.status(201).json(populated);
};

export const listInterviews = async (req, res) => {
  if (!['owner', 'caller'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const query = req.user.role === 'owner' ? {} : { assignedCaller: req.user._id };
  const interviews = await populateInterview(Interview.find(query)).sort({ createdAt: -1 });
  res.json(interviews);
};

export const getInterview = async (req, res) => {
  const interview = await populateInterview(Interview.findById(req.params.id));

  if (!interview) {
    return res.status(404).json({ message: 'Interview not found' });
  }

  ensureInterviewAccess(req, interview);
  res.json(interview);
};

export const advanceInterviewStage = async (req, res) => {
  const { stage, notes, status, offerDetails } = req.body;

  if (!stages.includes(stage)) {
    return res.status(400).json({ message: 'Invalid interview stage' });
  }

  const interview = await Interview.findById(req.params.id);

  if (!interview) {
    return res.status(404).json({ message: 'Interview not found' });
  }

  if (req.user.role !== 'owner' && (!interview.assignedCaller.equals(req.user._id) || req.user.role !== 'caller')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.user.role === 'caller' && stage !== 'rejected') {
    const currentIndex = stageOrder.indexOf(interview.currentStage);
    const nextAllowed = currentIndex >= 0 ? stageOrder[currentIndex + 1] : null;

    if (!nextAllowed || stage !== nextAllowed) {
      return res.status(400).json({
        message: `Cannot skip stages. Current stage: ${interview.currentStage}, next allowed: ${nextAllowed || 'none'}`
      });
    }
  }

  interview.currentStage = stage;
  interview.stages.push({
    stage,
    date: new Date(),
    notes,
    status: status || 'pending'
  });

  if (offerDetails) {
    interview.offerDetails = offerDetails;
  }

  await interview.save();
  await logActivity(req.user._id, `Advanced interview ${interview._id} to ${stage}`, 'interview', interview._id);
  await recalculatePerformance(interview.assignedCaller);
  await createNotification(req.app.get('io'), interview.assignedCaller, `Interview moved to ${stage}`, 'interview');

  const populated = await populateInterview(Interview.findById(interview._id));
  res.json(populated);
};

export const updateInterview = async (req, res) => {
  const allowed = ['candidateName', 'candidateEmail', 'position', 'company', 'assignedCaller', 'currentStage', 'offerDetails'];
  const updates = {};

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (updates.assignedCaller) {
    const caller = await User.findById(updates.assignedCaller);
    if (!caller || caller.role !== 'caller') {
      return res.status(400).json({ message: 'Assigned user must be a caller' });
    }
  }

  const interview = await populateInterview(Interview.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  }));

  if (!interview) {
    return res.status(404).json({ message: 'Interview not found' });
  }

  await logActivity(req.user._id, `Edited interview ${interview._id}`, 'interview', interview._id);
  await recalculatePerformance(interview.assignedCaller._id);
  res.json(interview);
};

export const deleteInterview = async (req, res) => {
  const interview = await Interview.findByIdAndDelete(req.params.id);

  if (!interview) {
    return res.status(404).json({ message: 'Interview not found' });
  }

  await logActivity(req.user._id, `Deleted interview ${interview._id}`, 'interview', interview._id);
  await recalculatePerformance(interview.assignedCaller);
  res.json({ message: 'Interview deleted' });
};
