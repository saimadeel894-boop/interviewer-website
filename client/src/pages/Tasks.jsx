import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { formatDate, titleize } from '../utils/format.js';

const tabs = ['all', 'assigned', 'in_progress', 'completed', 'failed'];

const Tasks = () => {
  const user = useAuthStore((state) => state.user);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('all');

  useEffect(() => {
    api.get('/tasks').then((response) => setTasks(response.data));
  }, []);

  const filtered = useMemo(() => {
    if (status === 'all') return tasks;
    return tasks.filter((task) => task.status === status);
  }, [status, tasks]);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Developer assignments and delivery status."
        action={user.role === 'owner' ? (
          <Link className="btn-primary" to="/tasks/new">
            <Plus size={17} />
            New Task
          </Link>
        ) : null}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${status === tab ? 'bg-navy text-white' : 'border border-slate-200 bg-white text-slate-600 hover:text-accent'}`}
            type="button"
            onClick={() => setStatus(tab)}
          >
            {titleize(tab)}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((task) => (
            <article key={task._id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-navy">{task.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description || 'No description'}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <span className="font-semibold text-slate-500">Developer</span>
                  <p className="mt-1 font-medium text-navy">{task.assignedTo?.name || 'Unassigned'}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Deadline</span>
                  <p className="mt-1 font-medium text-navy">{formatDate(task.deadline)}</p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Link className="btn-secondary" to={`/tasks/${task._id}`}>
                  <Eye size={16} />
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No tasks found" message="Tasks matching this status will appear here." />
      )}
    </div>
  );
};

export default Tasks;
