import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  candidateName: { type: String, required: true, trim: true },
  candidateEmail: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  assignedCaller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentStage: {
    type: String,
    enum: ['recruiter', 'hr', 'technical_1', 'technical_2', 'technical_3', 'final', 'offer', 'rejected'],
    default: 'recruiter'
  },
  stages: [{
    stage: String,
    date: Date,
    notes: String,
    status: { type: String, enum: ['pending', 'passed', 'failed'] }
  }],
  offerDetails: {
    salary: Number,
    company: String,
    date: Date
  },
  createdAt: { type: Date, default: Date.now }
});

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;
