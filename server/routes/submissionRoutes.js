import express from 'express';
import {
  createSubmission,
  getTargets,
  listSubmissions,
  setTarget,
  updateSubmissionStatus
} from '../controllers/submissionController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', createSubmission);
router.get('/', listSubmissions);
router.get('/targets', getTargets);
router.post('/targets', authorizeRoles('owner'), setTarget);
router.patch('/:id/status', updateSubmissionStatus);

export default router;
