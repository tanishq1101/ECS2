/** Mess staff overview: response rates and expected numbers per meal. */

import { ErrorState, LoadingState } from '../../components/common/StateBlocks';
import { MealStatusBadge } from '../../components/student/StatusBadges';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../services/api';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useApi(() => adminApi.summary(), []);

  if (loading) return <div className="admin-card"><LoadingState message="Loading today's overview…" /></div>;
  if (error) {
    return (
      <div className="admin-card">
        <ErrorState title="Unable to load the dashboard" message={error.message} onRetry={reload} />
      </div>
    );
  }

  return (
    <>
      <div className="admin-stat-grid">
        <div className="admin-stat">
          <p className="admin-stat-label">Registered students</p>
          <p className="admin-stat-value">{data.registeredStudents}</p>
          <p className="admin-stat-hint">On the mess roll</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Response rate today</p>
          <p className="admin-stat-value">{data.responseRate}%</p>
          <p className="admin-stat-hint">Across all three meals</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Expected covers today</p>
          <p className="admin-stat-value">{data.expectedToday}</p>
          <p className="admin-stat-hint">Sum of students marked attending</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Waste this week</p>
          <p className="admin-stat-value">{data.wasteThisWeekKg} kg</p>
          <p className="admin-stat-hint">Recorded by kitchen staff</p>
        </div>
      </div>

      <section className="admin-card" aria-labelledby="meals-heading">
        <div className="card-head">
          <div>
            <h2 className="card-title" id="meals-heading">Today&apos;s meals</h2>
            <p className="card-sub">Student responses against planned preparation</p>
          </div>
        </div>

        <div className="card-body">
          {data.meals.map((meal) => {
            const responded = meal.attending + meal.notAttending;
            const rate = Math.round((responded / (responded + meal.noResponse)) * 100);

            return (
              <div key={meal.id}>
                <div className="admin-meal-row">
                  <div>
                    <p className="admin-meal-name">
                      {meal.name} <MealStatusBadge status={meal.status} />
                    </p>
                    <p className="admin-meal-time">
                      {meal.time} · responses close {meal.cutoffLabel}
                    </p>
                  </div>

                  <div className="admin-numbers">
                    <div>
                      <p className="admin-number-label">Attending</p>
                      <p className="admin-number-value">{meal.attending}</p>
                    </div>
                    <div>
                      <p className="admin-number-label">Skipping</p>
                      <p className="admin-number-value">{meal.notAttending}</p>
                    </div>
                    <div>
                      <p className="admin-number-label">No response</p>
                      <p className="admin-number-value">{meal.noResponse}</p>
                    </div>
                  </div>
                </div>
                <div className="admin-bar" title={`${rate}% of students responded`}>
                  <div className="admin-bar-fill" style={{ width: `${rate}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="demo-note" style={{ marginTop: 18 }}>
        <span aria-hidden="true">ℹ️</span>
        <span>
          <strong>Prototype build.</strong> Figures come from the mock API. No database, fingerprint
          hardware or ML model is connected yet.
        </span>
      </p>
    </>
  );
}
