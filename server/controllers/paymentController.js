import PDFDocument from 'pdfkit';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Interview from '../models/Interview.js';
import Submission from '../models/Submission.js';
import { getMonthRange } from '../utils/dates.js';
import { getSettingsDocument } from '../utils/settings.js';
import { logActivity } from '../utils/activity.js';
import { createNotification } from '../utils/notifications.js';
import { toCsv } from '../utils/csv.js';

const ownerPopulate = (query) => query.populate('userId', 'name email role');

const limitedPayment = (payment) => ({
  id: payment._id,
  month: payment.month,
  baseSalary: payment.baseSalary,
  totalPaid: payment.totalPaid,
  status: payment.status
});

const calculateBonus = async (user, month) => {
  const settings = await getSettingsDocument();
  const { start, end } = getMonthRange(month);

  if (user.role === 'developer') {
    const completedTasks = await Task.countDocuments({
      assignedTo: user._id,
      status: 'completed',
      createdAt: { $gte: start, $lt: end }
    });

    return {
      bonus: completedTasks * settings.bonusRates.developerPerTask,
      reason: `${completedTasks} completed tasks`
    };
  }

  if (user.role === 'caller') {
    const offersReceived = await Interview.countDocuments({
      assignedCaller: user._id,
      currentStage: 'offer',
      createdAt: { $gte: start, $lt: end }
    });

    return {
      bonus: offersReceived * settings.bonusRates.callerPerOffer,
      reason: `${offersReceived} offers received`
    };
  }

  if (user.role === 'bidder') {
    const responsesReceived = await Submission.countDocuments({
      submittedBy: user._id,
      status: { $in: ['response', 'interview'] },
      date: { $gte: start, $lt: end }
    });

    return {
      bonus: responsesReceived * settings.bonusRates.bidderPerResponse,
      reason: `${responsesReceived} responses received`
    };
  }

  return { bonus: 0, reason: 'No bonus rule for this role' };
};

export const listPayments = async (req, res) => {
  if (req.user.role === 'owner') {
    const payments = await ownerPopulate(Payment.find()).sort({ month: -1, createdAt: -1 });
    return res.json(payments);
  }

  const payments = await Payment.find({ userId: req.user._id }).sort({ month: -1 });
  res.json(payments.map(limitedPayment));
};

export const createPayment = async (req, res) => {
  const { userId, month, baseSalary = 0, bonus = 0, bonusReason = '' } = req.body;

  if (!userId || !month) {
    return res.status(400).json({ message: 'User and month are required' });
  }

  const payment = await Payment.findOneAndUpdate(
    { userId, month },
    {
      baseSalary,
      bonus,
      bonusReason,
      totalPaid: Number(baseSalary) + Number(bonus)
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await logActivity(req.user._id, `Created payment for ${month}`, 'payment', payment._id);
  const populated = await ownerPopulate(Payment.findById(payment._id));
  res.status(201).json(populated);
};

export const calculatePayment = async (req, res) => {
  const { month, baseSalary = 0 } = req.body;

  if (!month) {
    return res.status(400).json({ message: 'Month is required' });
  }

  const user = await User.findById(req.params.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { bonus, reason } = await calculateBonus(user, month);
  const payment = await Payment.findOneAndUpdate(
    { userId: user._id, month },
    {
      baseSalary,
      bonus,
      bonusReason: reason,
      totalPaid: Number(baseSalary) + Number(bonus)
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await logActivity(req.user._id, `Calculated payment for ${user.name}`, 'payment', payment._id);
  const populated = await ownerPopulate(Payment.findById(payment._id));
  res.json(populated);
};

export const markPaymentPaid = async (req, res) => {
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status: 'paid', paidAt: new Date() },
    { new: true }
  ).populate('userId', 'name email role');

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  await logActivity(req.user._id, `Marked payment ${payment._id} as paid`, 'payment', payment._id);
  await createNotification(req.app.get('io'), payment.userId._id, `Salary for ${payment.month} marked paid`, 'salary');

  res.json(payment);
};

export const exportPaymentsCsv = async (req, res) => {
  const payments = await ownerPopulate(Payment.find()).sort({ month: -1 });
  const csv = toCsv(payments, [
    { label: 'User', value: (row) => row.userId?.name },
    { label: 'Email', value: (row) => row.userId?.email },
    { label: 'Role', value: (row) => row.userId?.role },
    { label: 'Month', value: (row) => row.month },
    { label: 'Base Salary', value: (row) => row.baseSalary },
    { label: 'Bonus', value: (row) => row.bonus },
    { label: 'Bonus Reason', value: (row) => row.bonusReason },
    { label: 'Total Paid', value: (row) => row.totalPaid },
    { label: 'Status', value: (row) => row.status }
  ]);

  res.header('Content-Type', 'text/csv');
  res.attachment('payments.csv');
  res.send(csv);
};

export const exportPaymentsPdf = async (req, res) => {
  const payments = await ownerPopulate(Payment.find()).sort({ month: -1 });
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.header('Content-Type', 'application/pdf');
  res.attachment('payments.pdf');
  doc.pipe(res);

  doc.fontSize(18).text('Workforce Payments', { align: 'center' });
  doc.moveDown();

  payments.forEach((payment) => {
    doc
      .fontSize(10)
      .text(`${payment.month} | ${payment.userId?.name || 'Unknown'} | ${payment.userId?.role || ''} | Total: ${payment.totalPaid} | ${payment.status}`);
  });

  doc.end();
};
