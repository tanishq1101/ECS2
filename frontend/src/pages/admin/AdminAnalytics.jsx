/** Prepared versus served over the past week, with recorded waste. */

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ErrorState, LoadingState } from '../../components/common/StateBlocks';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../services/api';

export default function AdminAnalytics() {
  const { data, loading, error, reload } = useApi(() => adminApi.analytics(), []);

  if (loading) return <div className="admin-card"><LoadingState message="Loading analytics…" /></div>;
  if (error) {
    return (
      <div className="admin-card">
        <ErrorState title="Unable to load analytics" message={error.message} onRetry={reload} />
      </div>
    );
  }

  const totalWaste = data.wasteTrend.reduce((sum, day) => sum + day.wastedKg, 0);
  const totalPrepared = data.wasteTrend.reduce((sum, day) => sum + day.prepared, 0);
  const totalServed = data.wasteTrend.reduce((sum, day) => sum + day.served, 0);

  return (
    <>
      <div className="admin-stat-grid">
        <div className="admin-stat">
          <p className="admin-stat-label">Portions prepared</p>
          <p className="admin-stat-value">{totalPrepared.toLocaleString()}</p>
          <p className="admin-stat-hint">Last 7 days</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Portions served</p>
          <p className="admin-stat-value">{totalServed.toLocaleString()}</p>
          <p className="admin-stat-hint">Last 7 days</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Food waste recorded</p>
          <p className="admin-stat-value">{totalWaste.toFixed(1)} kg</p>
          <p className="admin-stat-hint">Logged by kitchen staff</p>
        </div>
      </div>

      <section className="admin-card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Prepared vs served</h2>
            <p className="card-sub">Daily portions, with recorded waste in kilograms</p>
          </div>
        </div>

        <div className="card-body">
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.wasteTrend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.09)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#8ea3c0' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#8ea3c0' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#8ea3c0' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{
                    background: '#0f1d33',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    fontSize: 13,
                    color: '#fff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13, color: '#8ea3c0' }} />
                <Bar yAxisId="left" dataKey="prepared" name="Prepared" fill="#2b4f80" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar yAxisId="left" dataKey="served" name="Served" fill="#16a06a" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="wastedKg" name="Waste (kg)" stroke="#d9911c" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <p className="demo-note" style={{ marginTop: 18 }}>
        <span aria-hidden="true">ℹ️</span>
        <span>
          <strong>Prototype build.</strong> Mess-wide waste figures are still placeholder
          values. Student responses and attendance are read from the database.
        </span>
      </p>
    </>
  );
}
