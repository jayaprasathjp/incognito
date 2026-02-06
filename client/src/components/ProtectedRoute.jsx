import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ role }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // If admin required but user is player, maybe redirect to player dashboard?
    return <Navigate to="/" replace />; 
  }

  return <Outlet />;
};
