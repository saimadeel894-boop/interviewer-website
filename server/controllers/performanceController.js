import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { recalculatePerformance } from '../utils/performance.js';

export const getPerformance = async (req, res) => {
  const roles = ['developer', 'caller', 'bidder'];
  const users = await User.find({ role: { $in: roles } }).select('_id role');

  await Promise.all(users.map((user) => recalculatePerformance(user._id)));

  const profiles = await Profile.find({ userId: { $in: users.map((user) => user._id) } })
    .populate('userId', 'name email role avatar')
    .sort({ performanceScore: -1 });

  const grouped = roles.reduce((acc, role) => {
    acc[role] = profiles
      .filter((profile) => profile.userId?.role === role)
      .sort((a, b) => b.performanceScore - a.performanceScore);
    return acc;
  }, {});

  res.json(grouped);
};
