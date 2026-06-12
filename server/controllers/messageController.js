import Message from '../models/Message.js';
import User from '../models/User.js';
import { uploadBufferToCloudinary } from '../utils/cloudinary.js';
import { logActivity } from '../utils/activity.js';
import { buildConversationId, validateConversationPeer } from '../utils/conversation.js';

const populateMessage = (query) => query
  .populate('senderId', 'name email role avatar')
  .populate('receiverId', 'name email role avatar');

export const listParticipants = async (req, res) => {
  if (req.user.role === 'owner') {
    const users = await User.find({ role: { $ne: 'owner' }, status: 'active' }).select('-password').sort({ name: 1 });
    return res.json(users);
  }

  const owner = await User.findOne({ role: 'owner', status: 'active' }).select('-password');
  res.json(owner ? [owner] : []);
};

export const loadConversation = async (req, res) => {
  const otherUser = await validateConversationPeer(req.user, req.params.userId);
  const conversationId = buildConversationId(req.user._id, otherUser._id);
  const limit = Math.min(Number(req.query.limit) || 50, 50);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const messages = await populateMessage(
    Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
  );

  res.json(messages.reverse());
};

export const sendMessage = async (req, res) => {
  const otherUser = await validateConversationPeer(req.user, req.params.userId);
  const { content, fileUrl } = req.body;

  if (!content && !fileUrl) {
    return res.status(400).json({ message: 'Message content or file is required' });
  }

  const conversationId = buildConversationId(req.user._id, otherUser._id);
  const message = await Message.create({
    conversationId,
    senderId: req.user._id,
    receiverId: otherUser._id,
    content,
    fileUrl
  });

  await logActivity(req.user._id, 'Sent a message', 'message', message._id);

  const populated = await populateMessage(Message.findById(message._id));
  const io = req.app.get('io');
  io.to(req.user._id.toString()).to(otherUser._id.toString()).emit('receive_message', populated);

  res.status(201).json(populated);
};

export const uploadMessageFile = async (req, res) => {
  const otherUser = await validateConversationPeer(req.user, req.params.userId);

  if (!req.file) {
    return res.status(400).json({ message: 'File is required' });
  }

  const fileUrl = await uploadBufferToCloudinary(req.file, 'workforce-platform/messages');
  const conversationId = buildConversationId(req.user._id, otherUser._id);
  const message = await Message.create({
    conversationId,
    senderId: req.user._id,
    receiverId: otherUser._id,
    fileUrl
  });

  await logActivity(req.user._id, 'Sent a file message', 'message', message._id);

  const populated = await populateMessage(Message.findById(message._id));
  req.app.get('io').to(req.user._id.toString()).to(otherUser._id.toString()).emit('receive_message', populated);

  res.status(201).json(populated);
};

export const markConversationRead = async (req, res) => {
  const otherUser = await validateConversationPeer(req.user, req.params.userId);
  const conversationId = buildConversationId(req.user._id, otherUser._id);

  await Message.updateMany(
    { conversationId, receiverId: req.user._id, senderId: otherUser._id, read: false },
    { read: true }
  );

  req.app.get('io').to(otherUser._id.toString()).emit('message_read', {
    conversationId,
    readBy: req.user._id
  });

  res.json({ message: 'Conversation marked as read' });
};
