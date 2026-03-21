import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, requireTeam = true }) {
  const { isAuthenticated, loading, selectedTeam } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted font-condensed text-lg animate-pulse">
          Caricamento…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireTeam && !selectedTeam) return <Navigate to="/select-team" replace />;

  return children;
}
