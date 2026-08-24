/** Attendance records as they arrive from the mess entrance. */

import { AttendanceBadge } from '../../components/student/StatusBadges';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/StateBlocks';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../services/api';

export default function AdminAttendance() {
  const { data, loading, error, reload } = useApi(() => adminApi.attendance(), []);

  if (loading) return <div className="admin-card"><LoadingState message="Loading attendance records…" /></div>;
  if (error) {
    return (
      <div className="admin-card">
        <ErrorState title="Unable to load attendance" message={error.message} onRetry={reload} />
      </div>
    );
  }

  return (
    <>
      <p className="demo-note" style={{ marginBottom: 18 }}>
        <span aria-hidden="true">⚠️</span>
        <span>
          <strong>Hardware not connected.</strong> {data.note} Rows below are demo records; the
          reserved <code>POST /api/hardware/attendance</code> endpoint will write real ones.
        </span>
      </p>

      <section className="admin-card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Recent entries</h2>
            <p className="card-sub">{data.records.length} records</p>
          </div>
        </div>

        {data.records.length === 0 ? (
          <EmptyState icon="🧾" title="No attendance recorded yet" message="Records will appear here as students enter the mess." />
        ) : (
          <div className="table-scroll">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th scope="col">Student ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Meal</th>
                  <th scope="col">Time</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.studentId}</td>
                    <td>{record.name}</td>
                    <td>{record.meal}</td>
                    <td>{record.time}</td>
                    <td><AttendanceBadge status={record.status} source={record.method} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
