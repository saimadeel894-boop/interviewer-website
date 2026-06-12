import { useEffect, useState } from 'react';
import { Plus, Target } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { formatDate, getId, titleize } from '../utils/format.js';

const statuses = ['pending', 'response', 'rejected', 'interview'];

const Submissions = () => {
  const user = useAuthStore((state) => state.user);
  const [submissions, setSubmissions] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [targets, setTargets] = useState([]);
  const [form, setForm] = useState({ submittedBy: '', companyName: '', position: '', notes: '' });
  const [targetForm, setTargetForm] = useState({ userId: '', target: 0 });

  const load = async () => {
    const [submissionResponse, targetResponse] = await Promise.all([
      api.get('/submissions'),
      api.get('/submissions/targets')
    ]);
    setSubmissions(submissionResponse.data);
    setTargets(targetResponse.data);
  };

  useEffect(() => {
    load();
    if (user.role === 'owner') {
      api.get('/users', { params: { role: 'bidder' } }).then((response) => {
        setBidders(response.data);
        const first = response.data[0]?.id || response.data[0]?._id || '';
        setForm((current) => ({ ...current, submittedBy: first }));
        setTargetForm((current) => ({ ...current, userId: first }));
      });
    }
  }, [user.role]);

  const create = async (event) => {
    event.preventDefault();
    await api.post('/submissions', form);
    setForm((current) => ({ ...current, companyName: '', position: '', notes: '' }));
    load();
  };

  const updateStatus = async (id, status) => {
    const response = await api.patch(`/submissions/${id}/status`, { status });
    setSubmissions((current) => current.map((item) => (item._id === id ? response.data : item)));
  };

  const setDailyTarget = async (event) => {
    event.preventDefault();
    await api.post('/submissions/targets', targetForm);
    load();
  };

  return (
    <div>
      <PageHeader title="Submissions" description="Bidder submission tracking and target progress." />

      <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <form className="card grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4" onSubmit={create}>
          {user.role === 'owner' ? (
            <select className="field" value={form.submittedBy} onChange={(event) => setForm((current) => ({ ...current, submittedBy: event.target.value }))} required>
              {bidders.map((bidder) => <option key={bidder.id || bidder._id} value={bidder.id || bidder._id}>{bidder.name}</option>)}
            </select>
          ) : null}
          <input className="field" placeholder="Company" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} required />
          <input className="field" placeholder="Position" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} required />
          <div className="flex gap-2">
            <input className="field" placeholder="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            <button className="btn-primary px-3" type="submit" aria-label="Log submission">
              <Plus size={17} />
            </button>
          </div>
        </form>

        {user.role === 'owner' ? (
          <form className="card p-5" onSubmit={setDailyTarget}>
            <h2 className="flex items-center gap-2 text-base font-bold text-navy"><Target size={18} /> Daily Target</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem] xl:grid-cols-1">
              <select className="field" value={targetForm.userId} onChange={(event) => setTargetForm((current) => ({ ...current, userId: event.target.value }))}>
                {bidders.map((bidder) => <option key={bidder.id || bidder._id} value={bidder.id || bidder._id}>{bidder.name}</option>)}
              </select>
              <input className="field" type="number" min="0" value={targetForm.target} onChange={(event) => setTargetForm((current) => ({ ...current, target: Number(event.target.value) }))} />
            </div>
            <button className="btn-secondary mt-3 w-full" type="submit" disabled={!targetForm.userId}>Set Target</button>
          </form>
        ) : (
          <div className="card p-5">
            <h2 className="text-base font-bold text-navy">Today</h2>
            {targets.map((item) => (
              <div key={item._id} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-navy">{item.actual} / {item.target}</p>
                <p className="text-slate-500">Submissions logged</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {submissions.length ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Bidder</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((submission) => (
                  <tr key={submission._id}>
                    <td className="px-4 py-3 font-semibold text-navy">{submission.companyName}</td>
                    <td className="px-4 py-3">{submission.position}</td>
                    <td className="px-4 py-3">{submission.submittedBy?.name || 'Me'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(submission.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={submission.status} />
                        <select className="field max-w-40 py-1" value={submission.status} onChange={(event) => updateStatus(getId(submission), event.target.value)}>
                          {statuses.map((status) => <option key={status} value={status}>{titleize(status)}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="No submissions found" message="Logged submissions will appear here." />
      )}
    </div>
  );
};

export default Submissions;
