import mongoose from 'mongoose';

const submissionTargetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  target: { type: Number, default: 0 },
  actual: { type: Number, default: 0 }
});

submissionTargetSchema.index({ userId: 1, date: 1 }, { unique: true });

const SubmissionTarget = mongoose.model('SubmissionTarget', submissionTargetSchema);

export default SubmissionTarget;
