import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  skills: [String],
  resumeUrl: String,
  performanceScore: { type: Number, default: 0 },
  notes: String,
  historyLogs: [{
    action: String,
    timestamp: Date
  }]
});

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
