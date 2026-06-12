import Profile from '../models/Profile.js';
import Task from '../models/Task.js';
import Interview from '../models/Interview.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

const percent = (part, total) => {
  if (!total) return 0;
  return Math.round((part / total) * 100);
};

export const recalculatePerformance = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  let score = 0;

  if (user.role === 'developer') {
    const totalAssignedTasks = await Task.countDocuments({ assignedTo: user._id });
    const completedTasks = await Task.countDocuments({ assignedTo: user._id, status: 'completed' });
    score = percent(completedTasks, totalAssignedTasks);
  }

  if (user.role === 'caller') {
    const totalInterviews = await Interview.countDocuments({ assignedCaller: user._id });
    const offersReceived = await Interview.countDocuments({ assignedCaller: user._id, currentStage: 'offer' });
    score = percent(offersReceived, totalInterviews);
  }

  if (user.role === 'bidder') {
    const totalSubmissions = await Submission.countDocuments({ submittedBy: user._id });
    const responsesReceived = await Submission.countDocuments({
      submittedBy: user._id,
      status: { $in: ['response', 'interview'] }
    });
    score = percent(responsesReceived, totalSubmissions);
  }

  const profile = await Profile.findOneAndUpdate(
    { userId: user._id },
    {
      performanceScore: score,
      $push: { historyLogs: { action: `Performance recalculated to ${score}`, timestamp: new Date() } }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return profile;
};
