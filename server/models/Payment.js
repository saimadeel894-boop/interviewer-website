import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  baseSalary: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  bonusReason: String,
  totalPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
});

paymentSchema.index({ userId: 1, month: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
