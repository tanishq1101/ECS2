/** Mobile navigation. Replaces the sidebar below 860px with touch-sized targets. */

import { NavLink } from 'react-router-dom';
import { STUDENT_NAV } from './navItems';

export default function StudentBottomNav({ unreadCount }) {
  return (
    <nav className="bottom-nav" aria-label="Student portal">
      <div className="bottom-nav-inner">
        {STUDENT_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {item.short}
            {item.to === '/student/notifications' && unreadCount > 0 && (
              <span className="bottom-badge" aria-hidden="true">{unreadCount}</span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
