import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { refreshAccessToken } from './services/api.js';
import { useAuthStore } from './store/authStore.js';
import Chat from './pages/Chat.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Interviews from './pages/Interviews.jsx';
import Login from './pages/Login.jsx';
import Logs from './pages/Logs.jsx';
import Payments from './pages/Payments.jsx';
import Performance from './pages/Performance.jsx';
import Settings from './pages/Settings.jsx';
import Submissions from './pages/Submissions.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import TaskForm from './pages/TaskForm.jsx';
import Tasks from './pages/Tasks.jsx';
import UserForm from './pages/UserForm.jsx';
import Users from './pages/Users.jsx';

const RoleHome = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'owner') return <Navigate to="/dashboard" replace />;
  if (user.role === 'caller') return <Navigate to="/interviews" replace />;
  if (user.role === 'bidder') return <Navigate to="/submissions" replace />;
  return <Navigate to="/tasks" replace />;
};

const App = () => {
  const { setBootstrapped, clearSession } = useAuthStore();

  useEffect(() => {
    refreshAccessToken()
      .catch(() => clearSession())
      .finally(() => setBootstrapped(true));
  }, [clearSession, setBootstrapped]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RoleHome />} />

          <Route element={<ProtectedRoute roles={['owner']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/:id" element={<UserForm />} />
            <Route path="/tasks/new" element={<TaskForm />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route element={<ProtectedRoute roles={['owner', 'developer']} />}>
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
          </Route>

          <Route element={<ProtectedRoute roles={['owner', 'caller']} />}>
            <Route path="/interviews" element={<Interviews />} />
          </Route>

          <Route element={<ProtectedRoute roles={['owner', 'bidder']} />}>
            <Route path="/submissions" element={<Submissions />} />
          </Route>

          <Route path="/chat" element={<Chat />} />
          <Route path="/payments" element={<Payments />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
