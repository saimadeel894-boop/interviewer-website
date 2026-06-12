import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setSession } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', form);
      setSession(response.data.accessToken);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-appbg px-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-subtle md:grid-cols-[1fr_1.1fr]">
        <div className="bg-navy p-8 text-white md:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-base font-bold text-navy">WP</div>
          <h1 className="mt-8 text-3xl font-bold">Workforce Platform</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">
            Role-based operations for tasks, interviews, submissions, chat, salary tracking, and performance.
          </p>
        </div>

        <form className="p-8 md:p-10" onSubmit={submit}>
          <h2 className="text-2xl font-bold text-navy">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use the account created by the owner.</p>

          {error ? (
            <div className="mt-5 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </div>
          ) : null}

          <label className="mt-6 block text-sm font-semibold text-slate-700">
            Email
            <input
              className="field mt-2"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Password
            <input
              className="field mt-2"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          <button className="btn-primary mt-6 w-full" type="submit" disabled={loading}>
            <LogIn size={17} />
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
