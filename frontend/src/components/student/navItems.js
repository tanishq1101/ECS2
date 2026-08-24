/** Single source of truth for the student navigation, used by the sidebar,
 *  the mobile bottom bar and the page titles in the header. */

export const STUDENT_NAV = [
  { to: '/student/dashboard', label: 'Dashboard', short: 'Home', icon: '🏠',
    title: 'Dashboard', subtitle: "Your meals and responses for today" },
  { to: '/student/meals', label: 'Meals', short: 'Meals', icon: '🍽️',
    title: 'Meals', subtitle: 'Menus and responses for today and tomorrow' },
  { to: '/student/history', label: 'History', short: 'History', icon: '📊',
    title: 'Meal history', subtitle: 'What you planned and what was recorded' },
  { to: '/student/notifications', label: 'Notifications', short: 'Alerts', icon: '🔔',
    title: 'Notifications', subtitle: 'Cutoffs, menu changes and confirmations' },
  { to: '/student/profile', label: 'Profile', short: 'Profile', icon: '👤',
    title: 'Profile', subtitle: 'Your account and notification settings' },
];
