import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../services/api.js';
import { formatDateTime, titleize } from '../utils/format.js';

const Logs = () => {
  const [data, setData] = useState({ logs: [], page: 1, totalPages: 1 });

  const load = async (page = 1) => {
    const response = await api.get('/logs', { params: { page, limit: 25 } });
    setData(response.data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Activity Logs" description="Paginated audit trail for sensitive actions." />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.logs.map((log) => (
                <tr key={log._id}>
                  <td className="px-4 py-3 font-semibold text-navy">{log.userId?.name}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">{titleize(log.entity)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button className="btn-secondary" type="button" onClick={() => load(data.page - 1)} disabled={data.page <= 1}>Previous</button>
          <span className="text-sm font-semibold text-slate-500">Page {data.page} of {data.totalPages || 1}</span>
          <button className="btn-secondary" type="button" onClick={() => load(data.page + 1)} disabled={data.page >= data.totalPages}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default Logs;
