import { useEffect, useState } from 'react';
import { Download, Plus, RefreshCw } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api, downloadBlob } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { getId } from '../utils/format.js';

const currentMonth = new Date().toISOString().slice(0, 7);

const Payments = () => {
  const user = useAuthStore((state) => state.user);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ userId: '', month: currentMonth, baseSalary: 0, bonus: 0, bonusReason: '' });

  const load = async () => {
    const response = await api.get('/payments');
    setPayments(response.data);
  };

  useEffect(() => {
    load();
    if (user.role === 'owner') {
      api.get('/users').then((response) => {
        const payrollUsers = response.data.filter((item) => item.role !== 'owner');
        setUsers(payrollUsers);
        setForm((current) => ({ ...current, userId: payrollUsers[0]?.id || payrollUsers[0]?._id || '' }));
      });
    }
  }, [user.role]);

  const create = async (event) => {
    event.preventDefault();
    await api.post('/payments', form);
    load();
  };

  const calculate = async () => {
    await api.post(`/payments/calculate/${form.userId}`, {
      month: form.month,
      baseSalary: Number(form.baseSalary)
    });
    load();
  };

  const markPaid = async (id) => {
    await api.patch(`/payments/${id}/status`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        description={user.role === 'owner' ? 'Salary records, bonus calculation, and exports.' : 'Your limited salary view.'}
        action={user.role === 'owner' ? (
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" onClick={() => downloadBlob('/payments/export', 'payments.csv')}>
              <Download size={16} />
              CSV
            </button>
            <button className="btn-secondary" type="button" onClick={() => downloadBlob('/payments/export/pdf', 'payments.pdf')}>
              <Download size={16} />
              PDF
            </button>
          </div>
        ) : null}
      />

      {user.role === 'owner' ? (
        <form className="card mb-5 grid gap-3 p-5 md:grid-cols-3 xl:grid-cols-6" onSubmit={create}>
          <select className="field" value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} required>
            {users.map((item) => <option key={item.id || item._id} value={item.id || item._id}>{item.name} ({item.role})</option>)}
          </select>
          <input className="field" type="month" value={form.month} onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))} />
          <input className="field" type="number" min="0" placeholder="Base" value={form.baseSalary} onChange={(event) => setForm((current) => ({ ...current, baseSalary: Number(event.target.value) }))} />
          <input className="field" type="number" min="0" placeholder="Bonus" value={form.bonus} onChange={(event) => setForm((current) => ({ ...current, bonus: Number(event.target.value) }))} />
          <input className="field" placeholder="Bonus reason" value={form.bonusReason} onChange={(event) => setForm((current) => ({ ...current, bonusReason: event.target.value }))} />
          <div className="flex gap-2">
            <button className="btn-primary px-3" type="submit" aria-label="Create payment">
              <Plus size={17} />
            </button>
            <button className="btn-secondary px-3" type="button" onClick={calculate} aria-label="Calculate bonus" disabled={!form.userId}>
              <RefreshCw size={17} />
            </button>
          </div>
        </form>
      ) : null}

      {payments.length ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {user.role === 'owner' ? <th className="px-4 py-3">User</th> : null}
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Base</th>
                  {user.role === 'owner' ? <th className="px-4 py-3">Bonus</th> : null}
                  {user.role === 'owner' ? <th className="px-4 py-3">Reason</th> : null}
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  {user.role === 'owner' ? <th className="px-4 py-3 text-right">Action</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={getId(payment)}>
                    {user.role === 'owner' ? <td className="px-4 py-3 font-semibold text-navy">{payment.userId?.name}</td> : null}
                    <td className="px-4 py-3">{payment.month}</td>
                    <td className="px-4 py-3">{payment.baseSalary}</td>
                    {user.role === 'owner' ? <td className="px-4 py-3">{payment.bonus}</td> : null}
                    {user.role === 'owner' ? <td className="px-4 py-3 text-slate-500">{payment.bonusReason}</td> : null}
                    <td className="px-4 py-3 font-bold text-navy">{payment.totalPaid}</td>
                    <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
                    {user.role === 'owner' ? (
                      <td className="px-4 py-3 text-right">
                        <button className="btn-secondary" type="button" onClick={() => markPaid(getId(payment))} disabled={payment.status === 'paid'}>Mark Paid</button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="No payments found" message="Payment records will appear here." />
      )}
    </div>
  );
};

export default Payments;
