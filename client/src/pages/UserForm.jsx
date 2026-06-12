import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../services/api.js';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'developer',
  status: 'active',
  avatar: ''
};

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/users/${id}`).then((response) => {
      const user = response.data;
      setForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'developer',
        status: user.status || 'active',
        avatar: user.avatar || ''
      });
    });
  }, [id, isEdit]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      if (isEdit) {
        const { password, ...updates } = form;
        await api.put(`/users/${id}`, updates);
      } else {
        await api.post('/users', form);
      }

      navigate('/users');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save user');
    }
  };

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit User' : 'Create User'} action={<Link className="btn-secondary" to="/users">Back</Link>} />

      <form className="card max-w-3xl space-y-4 p-5" onSubmit={submit}>
        {error ? <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Name
            <input className="field mt-2" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email
            <input className="field mt-2" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
          </label>
        </div>

        {!isEdit ? (
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input className="field mt-2" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          </label>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Role
            <select className="field mt-2" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
              <option value="owner">Owner</option>
              <option value="developer">Developer</option>
              <option value="caller">Caller</option>
              <option value="bidder">Bidder</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Status
            <select className="field mt-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Avatar URL
            <input className="field mt-2" value={form.avatar} onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))} />
          </label>
        </div>

        <button className="btn-primary" type="submit">
          <Save size={17} />
          Save User
        </button>
      </form>
    </div>
  );
};

export default UserForm;
