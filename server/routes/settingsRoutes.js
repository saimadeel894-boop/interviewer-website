import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(verifyToken, authorizeRoles('owner'));

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
