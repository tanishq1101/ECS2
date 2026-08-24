/** A single notification row. Clicking an unread item marks it read. */

import { relativeTime } from '../../utils/format';

const TYPE_META = {
  cutoff: { icon: '⏰', label: 'Cutoff reminder', badge: 'badge-pending' },
  attendance: { icon: '📋', label: 'Attendance', badge: 'badge-positive' },
  menu: { icon: '🍲', label: 'Menu update', badge: 'badge-info' },
  intent: { icon: '✓', label: 'Meal response', badge: 'badge-positive' },
  reminder: { icon: '🔔', label: 'Reminder', badge: 'badge-neutral' },
};

export default function NotificationCard({ notification, onMarkRead }) {
  const meta = TYPE_META[notification.type] || TYPE_META.reminder;
  const unread = !notification.read;

  return (
    <button
      type="button"
      className={`notif-card${unread ? ' is-unread' : ''}`}
      onClick={() => onMarkRead(notification.id, !notification.read)}
      aria-label={`${meta.label}: ${notification.title}. ${unread ? 'Unread' : 'Read'}. Select to mark as ${unread ? 'read' : 'unread'}.`}
    >
      <span className="notif-icon" aria-hidden="true">{meta.icon}</span>

      <span className="notif-body">
        <span className="notif-top">
          <span className="notif-title">{notification.title}</span>
          <span className="notif-time">{relativeTime(notification.createdAt)}</span>
        </span>
        <span className="notif-text">{notification.body}</span>
        <span className="notif-tags">
          <span className={`badge ${meta.badge}`}>{meta.label}</span>
          {unread && (
            <span className="badge badge-info">
              <span className="badge-icon" aria-hidden="true">●</span>
              Unread
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export { TYPE_META };
