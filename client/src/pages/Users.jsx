import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Plus, Power, Search, Trash2 } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api } from '../services/api.js';
import { formatDate } from '../utils/format.js';

const roles = ['', 'owner', 'developer', 'caller', 'bidder'];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    const response = await api.get('/users', { params: role ? { role } : {} });
    setUsers(response.data);
  };

  useEffect(() => {
    loadUsers();
  }, [role]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(needle));
  }, [search, users]);

  const removeUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    loadUsers();
  };

  const toggleUser = async (id) => {
    await api.patch(`/users/${id}/status`);
    loadUsers();
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description="Owner-only user management."
        action={(
          <Link className="btn-primary" to="/users/new">
            <Plus size={17} />
            New User
          </Link>
        )}
      />

      <div className="card mb-5 grid gap-3 p-4 md:grid-cols-[1fr_13rem]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input className="field pl-10" placeholder="Search users" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="field" value={role} onChange={(event) => setRole(event.target.value)}>
          {roles.map((item) => (
            <option key={item} value={item}>{item ? item[0].toUpperCase() + item.slice(1) : 'All roles'}</option>
          ))}
        </select>
      </div>

      {filtered.length ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id || user._id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link className="btn-secondary px-3" to={`/users/${user.id || user._id}`} aria-label="Edit user">
                          <Edit size={16} />
                        </Link>
                        <button className="btn-secondary px-3" type="button" onClick={() => toggleUser(user.id || user._id)} aria-label="Toggle status">
                          <Power size={16} />
                        </button>
                        <button className="btn-danger px-3" type="button" onClick={() => removeUser(user.id || user._id)} aria-label="Delete user">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="No users found" message="Adjust the filters or create a new account." />
      )}
    </div>
  );
};

export default Users;
