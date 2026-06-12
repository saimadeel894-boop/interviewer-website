import { titleize } from '../utils/format.js';

const statusStyles = {
  active: 'bg-success/10 text-success',
  inactive: 'bg-slate-100 text-slate-500',
  assigned: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-accent/10 text-accent',
  completed: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
  pending: 'bg-slate-100 text-slate-600',
  response: 'bg-accent/10 text-accent',
  rejected: 'bg-danger/10 text-danger',
  interview: 'bg-amber-100 text-amber-700',
  paid: 'bg-success/10 text-success',
  offer: 'bg-success/10 text-success'
};

const StatusBadge = ({ status }) => {
  return (
    <span className={`inline-flex min-w-20 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || 'bg-slate-100 text-slate-600'}`}>
      {titleize(status)}
    </span>
  );
};

export default StatusBadge;
