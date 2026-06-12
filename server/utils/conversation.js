import User from '../models/User.js';

export const buildConversationId = (userIdA, userIdB) => {
  return [userIdA.toString(), userIdB.toString()].sort().join('_');
};

export const validateConversationPeer = async (currentUser, otherUserId) => {
  const otherUser = await User.findById(otherUserId).select('-password');

  if (!otherUser || otherUser.status !== 'active') {
    const error = new Error('Conversation user not found');
    error.status = 404;
    throw error;
  }

  const involvesOwner = currentUser.role === 'owner' || otherUser.role === 'owner';
  const bothOwners = currentUser.role === 'owner' && otherUser.role === 'owner';

  if (!involvesOwner || bothOwners || currentUser._id.equals(otherUser._id)) {
    const error = new Error('Chat is only allowed between the owner and one individual user');
    error.status = 403;
    throw error;
  }

  return otherUser;
};
