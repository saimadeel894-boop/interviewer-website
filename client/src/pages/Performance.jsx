import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../services/api.js';
import { titleize } from '../utils/format.js';

const roles = ['developer', 'caller', 'bidder'];

const Performance = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/performance').then((response) => setData(response.data));
  }, []);

  return (
    <div>
      <PageHeader title="Performance" description="Ranked role scorecards." />

      {!data ? <div className="text-sm font-semibold text-navy">Loading performance...</div> : (
        <div className="grid gap-5 lg:grid-cols-3">
          {roles.map((role) => (
            <section key={role} className="card overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-bold text-navy">{titleize(role)}s</h2>
              </div>
              {data[role]?.length ? (
                <div className="divide-y divide-slate-100">
                  {data[role].map((profile, index) => (
                    <div key={profile._id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="font-semibold text-navy">{index + 1}. {profile.userId?.name}</p>
                        <p className="text-xs text-slate-500">{profile.userId?.email}</p>
                      </div>
                      <span className="text-lg font-bold text-accent">{profile.performanceScore || 0}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState title="No data" message="Scores appear after role activity." />
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Performance;
