import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Paperclip, Save, Upload } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { formatDate, formatDateTime, getId, titleize } from '../utils/format.js';

const allStatuses = ['assigned', 'in_progress', 'completed', 'failed'];
const nextStatuses = {
  assigned: ['in_progress'],
  in_progress: ['completed', 'failed'],
  completed: [],
  failed: []
};

const TaskDetail = () => {
  const { id } = useParams();
  const user = useAuthStore((state) => state.user);
  const [task, setTask] = useState(null);
  const [status, setStatus] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const loadTask = async () => {
    const response = await api.get(`/tasks/${id}`);
    setTask(response.data);
    setStatus(response.data.status);
  };

  useEffect(() => {
    loadTask();
  }, [id]);

  const statusOptions = useMemo(() => {
    if (!task) return [];
    if (user.role === 'owner') return allStatuses;
    return nextStatuses[task.status] || [];
  }, [task, user.role]);

  const updateStatus = async () => {
    setMessage('');
    const response = await api.patch(`/tasks/${id}/status`, { status });
    setTask(response.data);
    setMessage('Status updated');
  };

  const uploadFile = async (event) => {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tasks/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setTask(response.data);
    setFile(null);
    setMessage('File uploaded');
  };

  if (!task) return <div className="text-sm font-semibold text-navy">Loading task...</div>;

  const canUpload = user.role === 'developer' && getId(task.assignedTo) === user.id;

  return (
    <div>
      <PageHeader title={task.title} action={<Link className="btn-secondary" to="/tasks">Back</Link>} />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={task.status} />
            <span className="text-sm font-semibold text-slate-500">Deadline: {formatDate(task.deadline)}</span>
          </div>

          <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description || 'No description'}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Assigned To</p>
              <p className="mt-1 font-semibold text-navy">{task.assignedTo?.name}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Created By</p>
              <p className="mt-1 font-semibold text-navy">{task.createdBy?.name}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-base font-bold text-navy">Files</h2>
            <div className="mt-3 space-y-2">
              {task.fileUploads?.length ? task.fileUploads.map((url) => (
                <a key={url} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-accent" href={url} target="_blank" rel="noreferrer">
                  <Paperclip size={16} />
                  {url}
                </a>
              )) : <p className="text-sm text-slate-500">No files uploaded.</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="text-base font-bold text-navy">Update Status</h2>
            <select className="field mt-3" value={status} onChange={(event) => setStatus(event.target.value)} disabled={!statusOptions.length}>
              {statusOptions.length ? statusOptions.map((item) => (
                <option key={item} value={item}>{titleize(item)}</option>
              )) : <option value={task.status}>{titleize(task.status)}</option>}
            </select>
            <button className="btn-primary mt-3 w-full" type="button" onClick={updateStatus} disabled={!statusOptions.length || status === task.status}>
              <Save size={16} />
              Save Status
            </button>
            {message ? <p className="mt-3 text-sm font-semibold text-success">{message}</p> : null}
          </div>

          {canUpload ? (
            <form className="card p-5" onSubmit={uploadFile}>
              <h2 className="text-base font-bold text-navy">Upload File</h2>
              <input className="field mt-3" type="file" accept="image/*,.pdf,.zip" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              <button className="btn-secondary mt-3 w-full" type="submit" disabled={!file}>
                <Upload size={16} />
                Upload
              </button>
            </form>
          ) : null}

          <div className="card p-5">
            <h2 className="text-base font-bold text-navy">Status History</h2>
            <div className="mt-3 space-y-3">
              {task.statusHistory?.map((item, index) => (
                <div key={`${item.status}-${index}`} className="border-l-2 border-accent/30 pl-3">
                  <p className="text-sm font-semibold text-navy">{titleize(item.status)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(item.updatedAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TaskDetail;
