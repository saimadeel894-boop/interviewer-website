import express from 'express';
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
  updateTaskStatus,
  uploadTaskFile
} from '../controllers/taskController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', authorizeRoles('owner'), createTask);
router.get('/', listTasks);
router.get('/:id', getTask);
router.put('/:id', authorizeRoles('owner'), updateTask);
router.patch('/:id/status', updateTaskStatus);
router.post('/:id/files', upload.single('file'), uploadTaskFile);
router.delete('/:id', authorizeRoles('owner'), deleteTask);

export default router;
