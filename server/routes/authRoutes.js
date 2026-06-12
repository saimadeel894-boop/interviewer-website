import express from 'express';
import { login, logout, refresh, register } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';
import { authLimiter } from '../middleware/authLimiter.js';

const router = express.Router();

router.use(authLimiter);

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/register', verifyToken, authorizeRoles('owner'), register);
router.post('/logout', verifyToken, logout);

export default router;
