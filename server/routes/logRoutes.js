import express from 'express';
import { listLogs } from '../controllers/logController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('owner'), listLogs);

export default router;
