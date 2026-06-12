import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { generateAccessToken, generateRefreshToken } from '../utils/tokens.js';
import { logActivity } from '../utils/activity.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const sendSession = (res, user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  res.cookie('refreshToken', refreshToken, cookieOptions);

  return res.json({
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  });
};

export const register = async (req, res) => {
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
  await logActivity(req.user._id, `Created ${role} account for ${name}`, 'user', user._id);

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    createdAt: user.createdAt
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: 'Account is inactive' });
  }

  await logActivity(user._id, 'Logged in', 'user', user._id);
  return sendSession(res, user);
};

export const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('refreshToken', cookieOptions);
  res.json({ message: 'Logged out' });
};
