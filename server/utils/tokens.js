import jwt from 'jsonwebtoken';

const tokenPayload = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role
});

export const generateAccessToken = (user) => {
  return jwt.sign(tokenPayload(user), process.env.JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
