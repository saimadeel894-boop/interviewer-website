import Notification from '../models/Notification.js';

export const listNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
};

export const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ message: 'Notifications marked read' });
};
