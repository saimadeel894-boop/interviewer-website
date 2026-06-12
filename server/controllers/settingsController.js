import { getSettingsDocument } from '../utils/settings.js';
import { logActivity } from '../utils/activity.js';

export const getSettings = async (req, res) => {
  const settings = await getSettingsDocument();
  res.json(settings);
};

export const updateSettings = async (req, res) => {
  const settings = await getSettingsDocument();

  if (req.body.bonusRates) {
    settings.bonusRates = { ...settings.bonusRates.toObject(), ...req.body.bonusRates };
  }

  if (req.body.currency !== undefined) {
    settings.currency = req.body.currency;
  }

  if (req.body.notificationPreferences) {
    settings.notificationPreferences = {
      ...settings.notificationPreferences.toObject(),
      ...req.body.notificationPreferences
    };
  }

  await settings.save();
  await logActivity(req.user._id, 'Updated platform settings', 'settings', settings._id);

  res.json(settings);
};
