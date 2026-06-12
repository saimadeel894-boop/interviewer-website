import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

const ProtectedRoute = ({ roles }) => {
  const { user, bootstrapped } = useAuthStore();
  const location = useLocation();

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-appbg text-sm font-semibold text-navy">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
