import User from '../models/User.js';
import Task from '../models/Task.js';
import Submission from '../models/Submission.js';
import Interview from '../models/Interview.js';
import { dateKey, endOfDay, startOfDay } from '../utils/dates.js';

const countByStatus = async (Model, statuses, query = {}) => {
  const rows = await Model.aggregate([
    { $match: query },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  return statuses.reduce((acc, status) => {
    const row = rows.find((item) => item._id === status);
    acc[status] = row ? row.count : 0;
    return acc;
  }, {});
};

export const getDashboard = async (req, res) => {
  const [developers, callers, bidders] = await Promise.all([
    User.countDocuments({ role: 'developer', status: 'active' }),
    User.countDocuments({ role: 'caller', status: 'active' }),
    User.countDocuments({ role: 'bidder', status: 'active' })
  ]);

  const taskStats = await countByStatus(Task, ['completed', 'failed', 'in_progress', 'assigned']);

  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const submissionsToday = await Submission.countDocuments({ date: { $gte: todayStart, $lte: todayEnd } });

  const sevenDaysAgo = startOfDay();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const weeklyRows = await Submission.aggregate([
    { $match: { date: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        submissions: { $sum: 1 }
      }
    }
  ]);

  const submissionsWeekly = Array.from({ length: 7 }, (_, index) => {
    const day = startOfDay(sevenDaysAgo);
    day.setDate(day.getDate() + index);
    const key = dateKey(day);
    const row = weeklyRows.find((item) => item._id === key);
    return { date: key, submissions: row ? row.submissions : 0 };
  });

  const [activeInterviews, offers, rejected, totalTasks, totalInterviews, totalSubmissions, responsiveSubmissions] = await Promise.all([
    Interview.countDocuments({ currentStage: { $nin: ['offer', 'rejected'] } }),
    Interview.countDocuments({ currentStage: 'offer' }),
    Interview.countDocuments({ currentStage: 'rejected' }),
    Task.countDocuments(),
    Interview.countDocuments(),
    Submission.countDocuments(),
    Submission.countDocuments({ status: { $in: ['response', 'interview'] } })
  ]);

  const completedTasks = taskStats.completed || 0;

  res.json({
    activeCounts: { developers, callers, bidders },
    taskStats,
    submissionsToday,
    submissionsWeekly,
    interviewPipelineStatus: { active: activeInterviews, offers, rejected },
    taskCompletionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    interviewSuccessRate: totalInterviews ? Math.round((offers / totalInterviews) * 100) : 0,
    submissionResponseRate: totalSubmissions ? Math.round((responsiveSubmissions / totalSubmissions) * 100) : 0
  });
};
