import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  bonusRates: {
    developerPerTask: { type: Number, default: 0 },
    callerPerOffer: { type: Number, default: 0 },
    bidderPerResponse: { type: Number, default: 0 }
  },
  currency: { type: String, default: 'USD' },
  notificationPreferences: {
    newTask: { type: Boolean, default: true },
    interviewUpdate: { type: Boolean, default: true },
    salaryUpdate: { type: Boolean, default: true }
  }
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
