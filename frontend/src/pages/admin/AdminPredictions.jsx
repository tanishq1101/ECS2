/**
 * Expected-attendance view for the kitchen.
 *
 * Placeholder numbers shaped like the future Python model's output. The page is
 * explicit that nothing is inferring them yet, and it lives on the staff side
 * only — students never see prediction or preparation figures.
 */

import { ErrorState, LoadingState } from '../../components/common/StateBlocks';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../services/api';

export default function AdminPredictions() {
  const { data, loading, error, reload } = useApi(() => adminApi.predictions(), []);

  if (loading) return <div className="admin-card"><LoadingState message="Loading expected attendance…" /></div>;
  if (error) {
    return (
      <div className="admin-card">
        <ErrorState title="Unable to load predictions" message={error.message} onRetry={reload} />
      </div>
    );
  }

  return (
    <>
      <p className="demo-note" style={{ marginBottom: 18 }}>
        <span aria-hidden="true">⚠️</span>
        <span>
          <strong>No model connected.</strong> {data.note} These placeholders show the shape of the
          output the ML service will provide once it is built.
        </span>
      </p>

      <div className="admin-grid-2">
        {data.predictions.map((prediction) => (
          <section className="admin-card" key={prediction.mealId}>
            <div className="card-head">
              <div>
                <h2 className="card-title">{prediction.meal}</h2>
                <p className="card-sub">Expected headcount</p>
              </div>
              <span className="badge badge-neutral">
                {Math.round(prediction.confidence * 100)}% confidence
              </span>
            </div>

            <div className="card-body">
              <p className="admin-stat-value" style={{ fontSize: 36 }}>
                {prediction.predictedHeadcount}
              </p>
              <p className="admin-stat-hint">
                Recommended preparation: {prediction.recommendedPortions} portions
              </p>

              <p className="admin-number-label" style={{ marginTop: 16, marginBottom: 8 }}>
                Signals used
              </p>
              <div className="menu-list">
                {prediction.drivers.map((driver) => (
                  <span key={driver} className="badge badge-info">{driver}</span>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
