/**
 * Route guard shared by both portals.
 *
 * Anonymous visitors are sent to the right sign-in page and, once they have
 * signed in, forwarded to the page they originally asked for. A signed-in user
 * who reaches for the other portal's routes is redirected to their own home
 * rather than shown an error, which keeps admin pages out of student sessions.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePathForRole, useAuth } from '../context/AuthContext';
import { LoadingState } from './common/StateBlocks';

export default function ProtectedRoute({ role, loginPath = '/login' }) {
  const { isAuthenticated, role: userRole, bootstrapping } = useAuth();
  const location = useLocation();

  // Waiting on the stored-token check; redirecting now would log the user out
  // on every page refresh.
  if (bootstrapping) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <LoadingState message="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (role && userRole !== role) {
    return <Navigate to={homePathForRole(userRole)} replace />;
  }

  return <Outlet />;
}
