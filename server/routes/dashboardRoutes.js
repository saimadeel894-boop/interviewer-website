import express from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('owner'), getDashboard);

export default router;
