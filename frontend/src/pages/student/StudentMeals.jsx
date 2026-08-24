/**
 * Meals page — the detailed counterpart to the dashboard's meal strip.
 *
 * Today and tomorrow are separate views so the page stays short on a phone, and
 * so responding for tomorrow feels like a deliberate choice rather than an
 * afterthought below the fold.
 */

import { useState } from 'react';
import MealCard from '../../components/student/MealCard';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/StateBlocks';
import { useMeals, summariseDay } from '../../hooks/useMeals';
import { formatLongDate, sortMeals } from '../../utils/format';

export default function StudentMeals() {
  const { data, loading, error, reload, saveIntent, savingKey } = useMeals();
  const [day, setDay] = useState('today');

  const activeDay = data?.[day];
  const meals = activeDay ? sortMeals(activeDay.meals) : [];
  const counts = summariseDay(meals);

  return (
    <>
      <div className="history-toolbar">
        <div
          className="notif-filters"
          role="group"
          aria-label="Choose which day to view"
        >
          {[
            { key: 'today', label: 'Today' },
            { key: 'tomorrow', label: 'Tomorrow' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              className="filter-chip"
              aria-pressed={day === option.key}
              onClick={() => setDay(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {activeDay && (
          <p className="section-sub">
            {formatLongDate(activeDay.date)} · {counts.attending} attending ·{' '}
            {counts.notAttending} not attending
            {counts.pending > 0 && ` · ${counts.pending} awaiting your response`}
          </p>
        )}
      </div>

      <p className="demo-note" style={{ marginBottom: 18 }}>
        <span aria-hidden="true">ℹ️</span>
        <span>
          <strong>Prototype build.</strong> Menus and attendance records come from demo data.
          Attendance is recorded at the mess entrance; the fingerprint hardware described in the
          project design is not connected yet.
        </span>
      </p>

      {loading && <CardSkeleton count={3} />}

      {!loading && error && (
        <div className="card">
          <ErrorState
            title="Unable to load your meals"
            message={error.message}
            onRetry={reload}
          />
        </div>
      )}

      {!loading && !error && meals.length === 0 && (
        <div className="card">
          <EmptyState
            title="No meals published for this day"
            message="The mess has not published a menu yet. Please check back later."
          />
        </div>
      )}

      {!loading && !error && meals.length > 0 && (
        <section aria-label={`${activeDay.label}'s meals`}>
          <div className="meal-grid">
            {meals.map((meal) => (
              <MealCard
                key={`${meal.date}-${meal.id}`}
                meal={meal}
                saving={savingKey === `${meal.date}-${meal.id}`}
                onSelect={(intent) => saveIntent(meal, intent)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="awareness">
        <span className="awareness-icon" aria-hidden="true">🥘</span>
        <div>
          <p className="awareness-title">Responding early helps most</p>
          <p className="awareness-text">
            A response given the day before reaches the kitchen while the order is still being
            planned, so preparation can match actual demand.
          </p>
        </div>
      </div>
    </>
  );
}
