import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async (userId, action, entity, entityId) => {
  try {
    await ActivityLog.create({ userId, action, entity, entityId });
  } catch (error) {
    console.error('Activity log failed:', error.message);
  }
};
