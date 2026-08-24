/**
 * Student home screen.
 *
 * Answers, in order: what is on today, have I responded, was my attendance
 * recorded, and how have I been doing. The primary action — responding to a
 * meal — is never more than one screen away.
 */

import { Link } from 'react-router-dom';
import MealCard from '../../components/student/MealCard';
import StatCard from '../../components/common/StatCard';
import { AttendanceBadge, IntentBadge } from '../../components/student/StatusBadges';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/StateBlocks';
import { useAuth } from '../../context/AuthContext';
import { useMeals, summariseDay } from '../../hooks/useMeals';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../services/api';
import { formatLongDate, greeting, sortMeals } from '../../utils/format';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload, saveIntent, savingKey } = useMeals();
  const history = useApi(() => studentApi.history(14), []);

  const todayMeals = data ? sortMeals(data.today.meals) : [];
  const tomorrowMeals = data ? sortMeals(data.tomorrow.meals) : [];
  const counts = summariseDay(todayMeals);

  // Once every meal today is closed, the useful next action is tomorrow.
  const todayClosed = todayMeals.length > 0 && todayMeals.every((meal) => !meal.intentOpen);
  const openToday = todayMeals.filter((meal) => meal.intentOpen);
  const nextCutoff = openToday.length ? openToday[0] : null;

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <>
      {/* The page's h1 lives in the shared header; this is its opening section. */}
      <section className="welcome" aria-labelledby="welcome-heading">
        <h2 id="welcome-heading">
          {greeting()}, {firstName} <span aria-hidden="true">👋</span>
        </h2>
        <p>
          Help us prepare the right amount of food today. Update your meal responses before the
          cutoff and the kitchen will plan around them.
        </p>

        <div className="welcome-meta">
          <span className="welcome-pill">
            <span aria-hidden="true">📅</span> {formatLongDate(new Date())}
          </span>
          {/* Cutoff pills only once the meals actually loaded — claiming the
              cutoffs have passed while the request failed would be wrong. */}
          {!loading && !error && todayMeals.length > 0 && (
            nextCutoff ? (
              <span className="welcome-pill">
                <span aria-hidden="true">⏰</span> Next cutoff — {nextCutoff.name} by{' '}
                {nextCutoff.cutoffLabel}
              </span>
            ) : (
              <span className="welcome-pill">
                <span aria-hidden="true">✓</span> All of today&apos;s cutoffs have passed
              </span>
            )
          )}
          {!loading && !error && counts.pending > 0 && (
            <span className="welcome-pill">
              <span aria-hidden="true">❗</span> {counts.pending} meal
              {counts.pending > 1 ? 's' : ''} still need a response
            </span>
          )}
        </div>
      </section>

      {/* ---------- Today at a glance ---------- */}
      <section className="section" aria-labelledby="summary-heading">
        <div className="section-head">
          <div>
            <h2 id="summary-heading">Today&apos;s meal summary</h2>
            <p className="section-sub">
              Your response is what you told the mess. Attendance is what was recorded at the mess.
            </p>
          </div>
        </div>

        <div className="card summary-card">
          {loading && <div className="skeleton" style={{ height: 168, margin: 12 }} />}

          {!loading && error && (
            <ErrorState
              title="Unable to load your meals"
              message={error.message}
              onRetry={reload}
            />
          )}

          {!loading && !error &&
            todayMeals.map((meal) => (
              <div className="summary-row" key={meal.id}>
                <div className="summary-meal">
                  <span className="summary-name">{meal.name}</span>
                  <span className="summary-time">{meal.time}</span>
                </div>
                <div className="summary-badges">
                  <IntentBadge intent={meal.studentIntent} />
                  <AttendanceBadge status={meal.attendanceStatus} source={meal.attendanceSource} />
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* ---------- Today's meals ---------- */}
      <section className="section" aria-labelledby="today-heading">
        <div className="section-head">
          <div>
            <h2 id="today-heading">Today&apos;s meals</h2>
            <p className="section-sub">Tap a response — you can change it until each cutoff.</p>
          </div>
          <Link to="/student/meals" className="btn btn-secondary btn-sm">
            View all meals
          </Link>
        </div>

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

        {!loading && !error && todayMeals.length === 0 && (
          <div className="card">
            <EmptyState
              title="No meals scheduled today"
              message="The mess has not published a menu for today. Check back later."
            />
          </div>
        )}

        {!loading && !error && todayMeals.length > 0 && (
          <div className="meal-grid">
            {todayMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                saving={savingKey === `${meal.date}-${meal.id}`}
                onSelect={(intent) => saveIntent(meal, intent)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---------- Tomorrow, once today is settled ---------- */}
      {!loading && !error && todayClosed && tomorrowMeals.length > 0 && (
        <section className="section" aria-labelledby="tomorrow-heading">
          <div className="section-head">
            <div>
              <h2 id="tomorrow-heading">Plan tomorrow</h2>
              <p className="section-sub">
                Today&apos;s responses are closed. Responding a day ahead gives the kitchen the most
                accurate headcount.
              </p>
            </div>
            <Link to="/student/meals" className="btn btn-secondary btn-sm">
              Full menus
            </Link>
          </div>

          <div className="meal-grid">
            {tomorrowMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                saving={savingKey === `${meal.date}-${meal.id}`}
                onSelect={(intent) => saveIntent(meal, intent)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Personal attendance overview ---------- */}
      <section className="section" aria-labelledby="overview-heading">
        <div className="section-head">
          <div>
            <h2 id="overview-heading">Your attendance overview</h2>
            <p className="section-sub">Last 14 days · your own records only</p>
          </div>
          <Link to="/student/history" className="btn btn-secondary btn-sm">
            See history
          </Link>
        </div>

        {history.loading && (
          <div className="stat-grid" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 104 }} />
            ))}
          </div>
        )}

        {!history.loading && history.error && (
          <div className="card">
            <ErrorState
              title="Unable to load your attendance overview"
              message={history.error.message}
              onRetry={history.reload}
            />
          </div>
        )}

        {!history.loading && !history.error && history.data && (
          <div className="stat-grid">
            <StatCard
              icon="🍽️"
              label="Meals planned"
              value={history.data.summary.mealsPlanned}
              hint="You said you'd attend"
            />
            <StatCard
              icon="✓"
              label="Meals attended"
              value={history.data.summary.mealsAttended}
              hint="Recorded at the mess"
              accent="green"
            />
            <StatCard
              icon="✕"
              label="Meals skipped"
              value={history.data.summary.mealsSkipped}
              hint="You told us in advance"
            />
            <StatCard
              icon="📈"
              label="Attendance rate"
              value={`${history.data.summary.attendanceRate}%`}
              hint="Of the meals you planned"
              meter={history.data.summary.attendanceRate}
            />
          </div>
        )}
      </section>

      <div className="awareness">
        <span className="awareness-icon" aria-hidden="true">🌱</span>
        <div>
          <p className="awareness-title">Every response helps</p>
          <p className="awareness-text">
            The closer the mess can get to the real headcount, the less food is prepared that nobody
            eats. One tap per meal is all it takes.
          </p>
        </div>
      </div>
    </>
  );
}
