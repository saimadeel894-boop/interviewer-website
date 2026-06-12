import express from 'express';
import { listNotifications, markAllNotificationsRead } from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', listNotifications);
router.patch('/read-all', markAllNotificationsRead);

export default router;
