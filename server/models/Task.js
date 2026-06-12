import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  deadline: Date,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'failed'],
    default: 'assigned'
  },
  fileUploads: [String],
  statusHistory: [{
    status: String,
    updatedAt: Date
  }],
  createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
