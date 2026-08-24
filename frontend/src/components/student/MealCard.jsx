/**
 * One meal, from the student's point of view.
 *
 * The card keeps intention and attendance in two clearly separated sections,
 * because they answer different questions: "what did I say?" versus "what did
 * the mess record?".
 */

import MealIntentSelector from './MealIntentSelector';
import { AttendanceBadge, IntentBadge, MealStatusBadge } from './StatusBadges';
import { formatDate, formatTime, todayKey } from '../../utils/format';

export default function MealCard({ meal, onSelect, saving }) {
  const showAttendance = meal.status !== 'upcoming' || meal.attendanceStatus !== 'none';
  // The same card serves today and tomorrow, so the menu heading names the day.
  const menuHeading = meal.date === todayKey() ? "Today's menu" : `Menu · ${formatDate(meal.date)}`;

  return (
    <article className="meal-card" data-intent={meal.studentIntent} aria-labelledby={`meal-${meal.date}-${meal.id}`}>
      <header className="meal-card-head">
        <div>
          <h3 className="meal-name" id={`meal-${meal.date}-${meal.id}`}>{meal.name}</h3>
          <p className="meal-time">{meal.time}</p>
        </div>
        <MealStatusBadge status={meal.status} />
      </header>

      <div className="meal-section">
        <p className="meal-label" id={`menu-${meal.date}-${meal.id}`}>{menuHeading}</p>
        <ul className="menu-list" aria-labelledby={`menu-${meal.date}-${meal.id}`}>
          {meal.menu.map((item) => (
            <li key={item} className="menu-item">{item}</li>
          ))}
        </ul>
      </div>

      <div className="meal-section">
        <div className="meal-status-row" style={{ marginBottom: 10 }}>
          <p className="meal-label" style={{ marginBottom: 0 }}>Your response</p>
          <IntentBadge intent={meal.studentIntent} />
        </div>
        <MealIntentSelector meal={meal} onSelect={onSelect} saving={saving} />
      </div>

      {showAttendance && (
        <div className="meal-section">
          <div className="meal-status-row">
            <p className="meal-label" style={{ marginBottom: 0 }}>Attendance at the mess</p>
            <AttendanceBadge status={meal.attendanceStatus} source={meal.attendanceSource} />
          </div>
          <p className="cutoff-note">
            <span aria-hidden="true">👆</span>
            {meal.attendanceStatus === 'verified'
              ? `Recorded ${formatTime(meal.attendanceVerifiedAt)}. Demo record — fingerprint hardware is not connected yet.`
              : 'Attendance is recorded at the mess entrance. Nothing has been recorded for this meal.'}
          </p>
        </div>
      )}
    </article>
  );
}
