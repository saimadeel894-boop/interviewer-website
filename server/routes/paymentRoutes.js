import express from 'express';
import {
  calculatePayment,
  createPayment,
  exportPaymentsCsv,
  exportPaymentsPdf,
  listPayments,
  markPaymentPaid
} from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleGuard.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', listPayments);
router.post('/', authorizeRoles('owner'), createPayment);
router.post('/calculate/:userId', authorizeRoles('owner'), calculatePayment);
router.get('/export', authorizeRoles('owner'), exportPaymentsCsv);
router.get('/export/pdf', authorizeRoles('owner'), exportPaymentsPdf);
router.patch('/:id/status', authorizeRoles('owner'), markPaymentPaid);

export default router;
