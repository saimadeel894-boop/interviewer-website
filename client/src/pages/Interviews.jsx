import { useEffect, useState } from 'react';
import { PhoneForwarded, Plus, Trash2 } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { formatDate, titleize } from '../utils/format.js';

const stages = ['recruiter', 'hr', 'technical_1', 'technical_2', 'technical_3', 'final', 'offer', 'rejected'];

const Interviews = () => {
  const user = useAuthStore((state) => state.user);
  const [interviews, setInterviews] = useState([]);
  const [callers, setCallers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState({
    candidateName: '',
    candidateEmail: '',
    position: '',
    company: '',
    assignedCaller: ''
  });

  const loadInterviews = async () => {
    const response = await api.get('/interviews');
    setInterviews(response.data);
  };

  useEffect(() => {
    loadInterviews();
    if (user.role === 'owner') {
      api.get('/users', { params: { role: 'caller' } }).then((response) => {
        setCallers(response.data);
        setForm((current) => ({ ...current, assignedCaller: response.data[0]?.id || response.data[0]?._id || '' }));
      });
    }
  }, [user.role]);

  const createInterview = async (event) => {
    event.preventDefault();
    await api.post('/interviews', form);
    setForm((current) => ({ ...current, candidateName: '', candidateEmail: '', position: '', company: '' }));
    loadInterviews();
  };

  const advance = async (id) => {
    const draft = drafts[id] || {};
    const response = await api.patch(`/interviews/${id}/stage`, {
      stage: draft.stage,
      notes: draft.notes,
      status: draft.status || 'pending'
    });
    setInterviews((current) => current.map((item) => (item._id === id ? response.data : item)));
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this interview?')) return;
    await api.delete(`/interviews/${id}`);
    loadInterviews();
  };

  return (
    <div>
      <PageHeader title="Interviews" description="Caller pipeline management and stage tracking." />

      {user.role === 'owner' ? (
        <form className="card mb-5 grid gap-4 p-5 lg:grid-cols-5" onSubmit={createInterview}>
          <input className="field" placeholder="Candidate name" value={form.candidateName} onChange={(event) => setForm((current) => ({ ...current, candidateName: event.target.value }))} required />
          <input className="field" type="email" placeholder="Candidate email" value={form.candidateEmail} onChange={(event) => setForm((current) => ({ ...current, candidateEmail: event.target.value }))} required />
          <input className="field" placeholder="Position" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} required />
          <input className="field" placeholder="Company" value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} required />
          <div className="flex gap-2">
            <select className="field" value={form.assignedCaller} onChange={(event) => setForm((current) => ({ ...current, assignedCaller: event.target.value }))} required>
              {callers.map((caller) => (
                <option key={caller.id || caller._id} value={caller.id || caller._id}>{caller.name}</option>
              ))}
            </select>
            <button className="btn-primary px-3" type="submit" aria-label="Create interview" disabled={!callers.length}>
              <Plus size={17} />
            </button>
          </div>
        </form>
      ) : null}

      {interviews.length ? (
        <div className="grid gap-4">
          {interviews.map((interview) => {
            const draft = drafts[interview._id] || { stage: interview.currentStage, notes: '', status: 'pending' };

            return (
              <article key={interview._id} className="card p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-navy">{interview.candidateName}</h2>
                    <p className="mt-1 text-sm text-slate-500">{interview.position} at {interview.company}</p>
                    <p className="mt-1 text-xs text-slate-400">{interview.candidateEmail}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={interview.currentStage} />
                    {user.role === 'owner' ? (
                      <button className="btn-danger px-3" type="button" onClick={() => remove(interview._id)} aria-label="Delete interview">
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-semibold text-slate-500">Caller</p>
                    <p className="mt-1 font-bold text-navy">{interview.assignedCaller?.name}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-semibold text-slate-500">Created</p>
                    <p className="mt-1 font-bold text-navy">{formatDate(interview.createdAt)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-semibold text-slate-500">Stage Updates</p>
                    <p className="mt-1 font-bold text-navy">{interview.stages?.length || 0}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[12rem_12rem_1fr_auto]">
                  <select className="field" value={draft.stage} onChange={(event) => setDrafts((current) => ({ ...current, [interview._id]: { ...draft, stage: event.target.value } }))}>
                    {stages.map((stage) => <option key={stage} value={stage}>{titleize(stage)}</option>)}
                  </select>
                  <select className="field" value={draft.status} onChange={(event) => setDrafts((current) => ({ ...current, [interview._id]: { ...draft, status: event.target.value } }))}>
                    <option value="pending">Pending</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                  <input className="field" placeholder="Notes" value={draft.notes} onChange={(event) => setDrafts((current) => ({ ...current, [interview._id]: { ...draft, notes: event.target.value } }))} />
                  <button className="btn-secondary" type="button" onClick={() => advance(interview._id)}>
                    <PhoneForwarded size={16} />
                    Advance
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No interviews found" message="Pipeline entries will appear here." />
      )}
    </div>
  );
};

export default Interviews;
