import express from 'express';
import {
  listParticipants,
  loadConversation,
  markConversationRead,
  sendMessage,
  uploadMessageFile
} from '../controllers/messageController.js';
import { verifyToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', listParticipants);
router.get('/:userId', loadConversation);
router.post('/:userId', sendMessage);
router.post('/:userId/file', upload.single('file'), uploadMessageFile);
router.patch('/read/:userId', markConversationRead);

export default router;
