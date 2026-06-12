import express from 'express';
import { getPerformance } from '../controllers/performanceController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('owner'), getPerformance);

export default router;
