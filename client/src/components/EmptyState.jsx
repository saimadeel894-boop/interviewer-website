const EmptyState = ({ title = 'Nothing here yet', message = 'Create a new record to get started.' }) => {
  return (
    <div className="card flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{message}</p>
    </div>
  );
};

export default EmptyState;
