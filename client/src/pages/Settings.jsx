import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../services/api.js';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then((response) => setSettings(response.data));
  }, []);

  const update = (path, value) => {
    setSettings((current) => {
      const next = structuredClone(current);
      const [group, key] = path.split('.');
      if (key) next[group][key] = value;
      else next[group] = value;
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    const response = await api.put('/settings', settings);
    setSettings(response.data);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  if (!settings) return <div className="text-sm font-semibold text-navy">Loading settings...</div>;

  return (
    <div>
      <PageHeader title="Settings" description="Bonus rates, currency, and notification preferences." />

      <form className="card max-w-4xl space-y-6 p-5" onSubmit={submit}>
        <section>
          <h2 className="text-base font-bold text-navy">Bonus Rates</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-slate-700">
              Developer per task
              <input className="field mt-2" type="number" min="0" value={settings.bonusRates.developerPerTask} onChange={(event) => update('bonusRates.developerPerTask', Number(event.target.value))} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Caller per offer
              <input className="field mt-2" type="number" min="0" value={settings.bonusRates.callerPerOffer} onChange={(event) => update('bonusRates.callerPerOffer', Number(event.target.value))} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Bidder per response
              <input className="field mt-2" type="number" min="0" value={settings.bonusRates.bidderPerResponse} onChange={(event) => update('bonusRates.bidderPerResponse', Number(event.target.value))} />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-navy">Currency</h2>
          <input className="field mt-3 max-w-xs" value={settings.currency} onChange={(event) => update('currency', event.target.value)} />
        </section>

        <section>
          <h2 className="text-base font-bold text-navy">Notifications</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {Object.entries(settings.notificationPreferences).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                {key.replace(/([A-Z])/g, ' $1')}
                <input type="checkbox" checked={value} onChange={(event) => update(`notificationPreferences.${key}`, event.target.checked)} />
              </label>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button className="btn-primary" type="submit">
            <Save size={17} />
            Save Settings
          </button>
          {saved ? <span className="text-sm font-semibold text-success">Saved</span> : null}
        </div>
      </form>
    </div>
  );
};

export default Settings;
