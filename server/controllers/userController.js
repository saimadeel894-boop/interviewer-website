import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { logActivity } from '../utils/activity.js';

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  avatar: user.avatar,
  createdAt: user.createdAt
});

export const listUsers = async (req, res) => {
  const query = {};

  if (req.query.role) {
    query.role = req.query.role;
  }

  const users = await User.find(query).select('-password').sort({ createdAt: -1 });
  res.json(users.map(serializeUser));
};

export const createUser = async (req, res) => {
  const { name, email, password, role, status, avatar } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password, and role are required' });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  const user = await User.create({ name, email, password, role, status, avatar });
  await Profile.create({ userId: user._id });
  await logActivity(req.user._id, `Created ${role} user ${name}`, 'user', user._id);

  res.status(201).json(serializeUser(user));
};

export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const profile = await Profile.findOne({ userId: user._id });
  res.json({ ...serializeUser(user), profile });
};

export const updateUser = async (req, res) => {
  const allowed = ['name', 'email', 'role', 'status', 'avatar'];
  const updates = {};

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  }).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await logActivity(req.user._id, `Edited user ${user.name}`, 'user', user._id);
  res.json(serializeUser(user));
};

export const deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await Profile.deleteOne({ userId: user._id });
  await logActivity(req.user._id, `Deleted user ${user.name}`, 'user', user._id);
  res.json({ message: 'User deleted' });
};

export const toggleStatus = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.status = user.status === 'active' ? 'inactive' : 'active';
  await user.save();
  await logActivity(req.user._id, `Changed ${user.name} status to ${user.status}`, 'user', user._id);

  res.json(serializeUser(user));
};
