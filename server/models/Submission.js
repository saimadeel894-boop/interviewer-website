import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'response', 'rejected', 'interview'],
    default: 'pending'
  },
  notes: String
});

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
