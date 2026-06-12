import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { logActivity } from '../utils/activity.js';
import { buildConversationId, validateConversationPeer } from '../utils/conversation.js';

const populateMessage = (query) => query
  .populate('senderId', 'name email role avatar')
  .populate('receiverId', 'name email role avatar');

const initializeSockets = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Socket token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user || user.status !== 'active') {
        return next(new Error('Invalid socket user'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = socket.user._id.toString();
    socket.join(userRoom);
    io.emit('online_status', { userId: userRoom, online: true });

    socket.on('join_room', async ({ userId }, callback) => {
      try {
        const otherUser = await validateConversationPeer(socket.user, userId);
        const conversationId = buildConversationId(socket.user._id, otherUser._id);
        socket.join(conversationId);
        callback?.({ conversationId });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    socket.on('send_message', async ({ receiverId, content }, callback) => {
      try {
        const otherUser = await validateConversationPeer(socket.user, receiverId);

        if (!content) {
          throw new Error('Message content is required');
        }

        const conversationId = buildConversationId(socket.user._id, otherUser._id);
        const message = await Message.create({
          conversationId,
          senderId: socket.user._id,
          receiverId: otherUser._id,
          content
        });

        await logActivity(socket.user._id, 'Sent a socket message', 'message', message._id);
        const populated = await populateMessage(Message.findById(message._id));
        io.to(socket.user._id.toString()).to(otherUser._id.toString()).emit('receive_message', populated);
        callback?.({ message: populated });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    socket.on('typing', async ({ receiverId }) => {
      try {
        const otherUser = await validateConversationPeer(socket.user, receiverId);
        io.to(otherUser._id.toString()).emit('user_typing', { userId: socket.user._id });
      } catch (error) {
        // Ignore invalid typing attempts.
      }
    });

    socket.on('stop_typing', async ({ receiverId }) => {
      try {
        const otherUser = await validateConversationPeer(socket.user, receiverId);
        io.to(otherUser._id.toString()).emit('user_typing', { userId: socket.user._id, stopped: true });
      } catch (error) {
        // Ignore invalid typing attempts.
      }
    });

    socket.on('disconnect', () => {
      io.emit('online_status', { userId: userRoom, online: false });
    });
  });
};

export default initializeSockets;
