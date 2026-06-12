import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PhoneCall,
  ScrollText,
  Send,
  Settings,
  Trophy,
  UserCircle,
  Users
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { formatDateTime } from '../utils/format.js';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['owner'] },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList, roles: ['owner', 'developer'] },
  { to: '/interviews', label: 'Interviews', icon: PhoneCall, roles: ['owner', 'caller'] },
  { to: '/submissions', label: 'Submissions', icon: Send, roles: ['owner', 'bidder'] },
  { to: '/chat', label: 'Chat', icon: MessageSquare, roles: ['owner', 'developer', 'caller', 'bidder'] },
  { to: '/payments', label: 'Payments', icon: CreditCard, roles: ['owner', 'developer', 'caller', 'bidder'] },
  { to: '/performance', label: 'Performance', icon: Trophy, roles: ['owner'] },
  { to: '/logs', label: 'Logs', icon: ScrollText, roles: ['owner'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] }
];

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, clearSession } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const visibleItems = useMemo(() => {
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user.role]);

  useEffect(() => {
    api.get('/notifications')
      .then((response) => setNotifications(response.data))
      .catch(() => setNotifications([]));
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  };

  const markNotificationsRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  return (
    <div className="min-h-screen bg-appbg text-slate-800">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-navy text-white transition-all md:block ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-navy">
              WP
            </div>
            {!collapsed ? <span className="truncate text-sm font-bold">Workforce Platform</span> : null}
          </Link>
          <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">
            <Menu size={18} />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-white text-navy' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={19} />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className={`transition-all ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg border border-slate-200 p-2 text-navy md:hidden" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">
              <Menu size={18} />
            </button>
            <div>
              <p className="text-sm font-semibold text-navy">{user.name}</p>
              <p className="text-xs font-medium text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              className="relative rounded-lg border border-slate-200 p-2 text-navy hover:border-accent hover:text-accent"
              onClick={() => setShowNotifications((value) => !value)}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <button type="button" className="btn-secondary px-3" onClick={logout}>
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {showNotifications ? (
              <div className="absolute right-0 top-12 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-subtle">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-navy">Notifications</span>
                  <button type="button" className="text-xs font-semibold text-accent" onClick={markNotificationsRead}>
                    Mark read
                  </button>
                </div>
                <div className="max-h-80 space-y-2 overflow-auto">
                  {notifications.length ? notifications.map((notification) => (
                    <div key={notification._id} className={`rounded-lg border px-3 py-2 ${notification.read ? 'border-slate-100 bg-white' : 'border-accent/30 bg-accent/5'}`}>
                      <p className="text-sm font-medium text-slate-700">{notification.message}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(notification.createdAt)}</p>
                    </div>
                  )) : (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                      <UserCircle size={16} />
                      No notifications
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
