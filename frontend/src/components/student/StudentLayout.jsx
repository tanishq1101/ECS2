/**
 * Chrome for every student page: sidebar on desktop, bottom bar on mobile, and
 * a sticky header. The unread notification count is loaded once here and shared
 * with child pages through the router outlet, so the badge stays in sync
 * without each page fetching it again.
 */

import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import StudentHeader from './StudentHeader';
import StudentBottomNav from './StudentBottomNav';
import { STUDENT_NAV } from './navItems';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const data = await studentApi.notifications();
      setUnreadCount(data.unreadCount);
    } catch {
      // A failed badge count must never block the page the student came for.
    }
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  const current = STUDENT_NAV.find((item) => pathname.startsWith(item.to)) || STUDENT_NAV[0];

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="student-shell">
      <a className="skip-link" href="#student-main">Skip to main content</a>

      <StudentSidebar user={user} unreadCount={unreadCount} onLogout={handleLogout} />

      <div className="student-main">
        <StudentHeader
          title={current.title}
          subtitle={current.subtitle}
          user={user}
          unreadCount={unreadCount}
        />

        {/* key on pathname gives each page its own quiet fade-in */}
        <main className="student-content" id="student-main" key={pathname}>
          <Outlet context={{ unreadCount, setUnreadCount, refreshUnread }} />
        </main>
      </div>

      <StudentBottomNav unreadCount={unreadCount} />
    </div>
  );
}
