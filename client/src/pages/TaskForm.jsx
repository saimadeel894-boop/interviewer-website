import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../services/api.js';

const TaskForm = () => {
  const navigate = useNavigate();
  const [developers, setDevelopers] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    assignedTo: ''
  });

  useEffect(() => {
    api.get('/users', { params: { role: 'developer' } }).then((response) => {
      setDevelopers(response.data);
      setForm((current) => ({ ...current, assignedTo: response.data[0]?.id || response.data[0]?._id || '' }));
    });
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await api.post('/tasks', form);
      navigate('/tasks');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create task');
    }
  };

  return (
    <div>
      <PageHeader title="Create Task" action={<Link className="btn-secondary" to="/tasks">Back</Link>} />

      <form className="card max-w-3xl space-y-4 p-5" onSubmit={submit}>
        {error ? <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</div> : null}

        <label className="block text-sm font-semibold text-slate-700">
          Title
          <input className="field mt-2" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Description
          <textarea className="field mt-2 min-h-32" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Developer
            <select className="field mt-2" value={form.assignedTo} onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))} required>
              {developers.map((developer) => (
                <option key={developer.id || developer._id} value={developer.id || developer._id}>{developer.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Deadline
            <input className="field mt-2" type="date" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
          </label>
        </div>

        <button className="btn-primary" type="submit" disabled={!developers.length}>
          <Save size={17} />
          Create Task
        </button>
      </form>
    </div>
  );
};

export default TaskForm;
