/**
 * Meal history — what the student planned against what was recorded.
 *
 * Kept deliberately lighter than the staff analytics dashboard: personal
 * records only, one chart, and a table that becomes cards on small screens.
 */

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatCard from '../../components/common/StatCard';
import { AttendanceBadge, IntentBadge } from '../../components/student/StatusBadges';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/StateBlocks';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../services/api';
import { formatDate } from '../../utils/format';

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
];

const COLOR_PLANNED = '#2b4f80';
const COLOR_ATTENDED = '#16a06a';

export default function StudentHistory() {
  const [days, setDays] = useState(14);
  const { data, loading, error, reload } = useApi(() => studentApi.history(days), [days]);

  const records = data?.records ?? [];
  const summary = data?.summary;
  const trend = (data?.trend ?? []).map((point) => ({ ...point, label: formatDate(point.date) }));

  return (
    <>
      <div className="history-toolbar">
        <div className="notif-filters" role="group" aria-label="Choose a date range">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              className="filter-chip"
              aria-pressed={days === range.days}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card">
          <LoadingState message="Loading your meal history…" />
        </div>
      )}

      {!loading && error && (
        <div className="card">
          <ErrorState
            title="Unable to load your history"
            message={error.message}
            onRetry={reload}
          />
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="card">
          <EmptyState
            icon="📊"
            title="No meal history available yet"
            message="Once you start responding to meals and attending the mess, your records will appear here."
          />
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <>
          <div className="stat-grid">
            <StatCard icon="🍽️" label="Meals planned" value={summary.mealsPlanned} hint="You said you'd attend" />
            <StatCard icon="✓" label="Meals attended" value={summary.mealsAttended} hint="Recorded at the mess" accent="green" />
            <StatCard icon="✕" label="Meals skipped" value={summary.mealsSkipped} hint="Told the mess in advance" />
            <StatCard
              icon="📈"
              label="Attendance rate"
              value={`${summary.attendanceRate}%`}
              hint="Of the meals you planned"
              meter={summary.attendanceRate}
            />
          </div>

          <section className="section" aria-labelledby="trend-heading">
            <div className="section-head">
              <div>
                <h2 id="trend-heading">Attendance vs meal responses</h2>
                <p className="section-sub">
                  Meals you planned each day compared with meals recorded at the mess.
                </p>
              </div>
            </div>

            <div className="card chart-card">
              <div className="legend-row">
                <span className="legend-item">
                  <span className="legend-swatch" style={{ background: COLOR_PLANNED }} aria-hidden="true" />
                  Planned (your response)
                </span>
                <span className="legend-item">
                  <span className="legend-swatch" style={{ background: COLOR_ATTENDED }} aria-hidden="true" />
                  Attended (recorded)
                </span>
              </div>

              {/* The table below carries the same information for screen readers. */}
              <div className="chart-wrap" role="img" aria-label="Bar chart comparing meals planned with meals attended per day. The full figures are listed in the records table below.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }} barGap={5}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e7f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: '#667085' }}
                      axisLine={{ stroke: '#e2e7f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, 3]}
                      ticks={[0, 1, 2, 3]}
                      tick={{ fontSize: 12, fill: '#667085' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(16,24,40,0.04)' }}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e7f0',
                        boxShadow: '0 4px 12px rgba(16,24,40,0.08)',
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="planned" name="Planned" fill={COLOR_PLANNED} radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="attended" name="Attended" fill={COLOR_ATTENDED} radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="section" aria-labelledby="records-heading">
            <div className="section-head">
              <div>
                <h2 id="records-heading">Meal records</h2>
                <p className="section-sub">
                  {records.length} records · your response and what was recorded at the mess
                </p>
              </div>
            </div>

            {/* Desktop: table. Mobile: the same rows as cards (no sideways scrolling). */}
            <div className="card history-table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <caption className="sr-only">
                    Your meal history: date, meal, the response you gave and the attendance recorded.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Meal</th>
                      <th scope="col">Your response</th>
                      <th scope="col">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td className="date-cell">{formatDate(record.date)}</td>
                        <td>{record.meal}</td>
                        <td><IntentBadge intent={record.intent} /></td>
                        <td>
                          <AttendanceBadge
                            status={record.attendanceStatus}
                            source={record.attendanceSource}
                            past
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="history-cards">
              {records.map((record) => (
                <article className="history-card" key={record.id}>
                  <div className="history-card-top">
                    <span className="history-card-meal">{record.meal}</span>
                    <span className="history-card-date">{formatDate(record.date)}</span>
                  </div>
                  <div className="history-card-badges">
                    <IntentBadge intent={record.intent} />
                    <AttendanceBadge
                      status={record.attendanceStatus}
                      source={record.attendanceSource}
                      past
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <p className="demo-note" style={{ marginTop: 20 }}>
            <span aria-hidden="true">ℹ️</span>
            <span>
              <strong>Prototype build.</strong> These records are demo data. Once the mess entrance
              hardware is connected, attendance rows will be written by real scans instead.
            </span>
          </p>
        </>
      )}
    </>
  );
}
