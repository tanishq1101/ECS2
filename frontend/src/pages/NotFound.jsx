import { Link } from 'react-router-dom';
import { homePathForRole, useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { isAuthenticated, role } = useAuth();
  const home = isAuthenticated ? homePathForRole(role) : '/login';

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 460, width: '100%' }}>
        <div className="card-body">
          <div className="state-block" style={{ padding: '24px 8px' }}>
            <span className="state-icon" aria-hidden="true">🧭</span>
            <p className="state-title">Page not found</p>
            <p className="state-text">
              That page does not exist in the Smart Mess portal.
            </p>
            <Link to={home} className="btn btn-primary btn-sm">
              {isAuthenticated ? 'Back to your dashboard' : 'Go to sign in'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
