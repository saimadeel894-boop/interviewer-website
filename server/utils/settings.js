import Settings from '../models/Settings.js';

export const getSettingsDocument = async () => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({});
  }

  return settings;
};
