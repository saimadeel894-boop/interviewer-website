import express from 'express';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  toggleStatus,
  updateUser
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(verifyToken, authorizeRoles('owner'));

router.get('/', listUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/status', toggleStatus);

export default router;
