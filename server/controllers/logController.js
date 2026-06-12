import ActivityLog from '../models/ActivityLog.js';

export const listLogs = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  const [logs, total] = await Promise.all([
    ActivityLog.find()
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ActivityLog.countDocuments()
  ]);

  res.json({
    logs,
    page,
    totalPages: Math.ceil(total / limit),
    total
  });
};
