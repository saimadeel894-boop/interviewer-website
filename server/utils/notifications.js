import Notification from '../models/Notification.js';

export const createNotification = async (io, userId, message, type = 'general') => {
  const notification = await Notification.create({ userId, message, type });

  if (io) {
    io.to(userId.toString()).emit('notification', notification);
  }

  return notification;
};
