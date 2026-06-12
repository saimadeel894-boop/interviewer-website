import express from 'express';
import {
  advanceInterviewStage,
  createInterview,
  deleteInterview,
  getInterview,
  listInterviews,
  updateInterview
} from '../controllers/interviewController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', authorizeRoles('owner'), createInterview);
router.get('/', listInterviews);
router.get('/:id', getInterview);
router.patch('/:id/stage', advanceInterviewStage);
router.put('/:id', authorizeRoles('owner'), updateInterview);
router.delete('/:id', authorizeRoles('owner'), deleteInterview);

export default router;
