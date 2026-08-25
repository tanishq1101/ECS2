/**
 * Account details, personal attendance summary and notification settings.
 *
 * Account fields are read-only: the prototype backend has no update endpoint
 * for them, and showing an editable field that silently discards the change
 * would be worse than showing none.
 */

import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/common/StatCard';
import { ErrorState, LoadingState } from '../../components/common/StateBlocks';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatFullDate, initials } from '../../utils/format';

const PREFERENCES = [
  { key: 'notificationsEnabled', name: 'Notifications',
    desc: 'Receive meal-related notifications in the portal.' },
  { key: 'mealReminders', name: 'Meal reminders',
    desc: 'A nudge before each meal window opens.' },
  { key: 'cutoffReminders', name: 'Cutoff reminders',
    desc: 'A reminder shortly before responses close for a meal.' },
  { key: 'menuUpdates', name: 'Menu updates',
    desc: 'Tell me when the mess changes a published menu.' },
];

export default function StudentProfile() {
  const { data, loading, error, reload, setData } = useApi(() => studentApi.profile(), []);
  const { logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  async function togglePreference(key, value) {
    // Optimistic: a switch that lags behind the finger feels broken.
    const previous = data.preferences;
    setData({ ...data, preferences: { ...previous, [key]: value } });

    try {
      const response = await studentApi.updatePreferences({ [key]: value });
      setData((current) => ({ ...current, preferences: response.preferences }));
    } catch (err) {
      setData((current) => ({ ...current, preferences: previous }));
      notify({ variant: 'error', title: 'Could not save that setting', text: err.message });
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return (
      <div className="card">
        <LoadingState message="Loading your profile…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <ErrorState
          title="Unable to load your profile"
          message={error.message}
          onRetry={reload}
        />
      </div>
    );
  }

  const { profile, summary, preferences } = data;

  const details = [
    { label: 'Full name', value: profile.name },
    { label: 'Student ID', value: profile.studentId },
    { label: 'Email', value: profile.email },
    { label: 'Hostel', value: profile.hostel },
    { label: 'Room', value: profile.room || 'Not on record' },
    { label: 'Programme', value: profile.program },
    { label: 'Year', value: profile.year },
    { label: 'Mess plan', value: profile.messPlan },
    { label: 'Account role', value: 'Student' },
    { label: 'Member since', value: profile.joinedOn ? formatFullDate(profile.joinedOn) : '—' },
  ];

  return (
    <>
      <section className="profile-hero">
        <span className="avatar" aria-hidden="true">{initials(profile.name)}</span>
        <div>
          <p className="profile-hero-name">{profile.name}</p>
          <p className="profile-hero-meta">
            {profile.studentId} · {profile.hostel}
            {profile.room ? ` · Room ${profile.room}` : ''}
          </p>
        </div>
      </section>

      <div className="profile-grid">
        <div>
          <section className="card" aria-labelledby="account-heading">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="account-heading">Account details</h2>
                <p className="card-sub">Issued by the mess office</p>
              </div>
            </div>
            <div className="card-body">
              <div className="detail-list">
                {details.map((row) => (
                  <div className="detail-row" key={row.label}>
                    <span className="detail-label">{row.label}</span>
                    <span className="detail-value">{row.value}</span>
                  </div>
                ))}
              </div>

              <p className="demo-note" style={{ marginTop: 16 }}>
                <span aria-hidden="true">🔒</span>
                <span>
                  These details are read-only in the portal. Contact the mess office to correct
                  anything here.
                </span>
              </p>
            </div>
          </section>

          <section className="card" style={{ marginTop: 18 }} aria-labelledby="settings-heading">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="settings-heading">Notification settings</h2>
                <p className="card-sub">Choose what the portal tells you about</p>
              </div>
            </div>
            <div className="card-body">
              {PREFERENCES.map((pref) => {
                const dependent = pref.key !== 'notificationsEnabled';
                const disabled = dependent && !preferences.notificationsEnabled;

                return (
                  <div className="pref-row" key={pref.key}>
                    <div>
                      <p className="pref-name">{pref.name}</p>
                      <p className="pref-desc">{pref.desc}</p>
                    </div>
                    <span className="switch">
                      <input
                        type="checkbox"
                        id={`pref-${pref.key}`}
                        checked={!!preferences[pref.key] && !disabled}
                        disabled={disabled}
                        onChange={(e) => togglePreference(pref.key, e.target.checked)}
                      />
                      <label htmlFor={`pref-${pref.key}`} className="sr-only">{pref.name}</label>
                      <span className="switch-track" aria-hidden="true" />
                      <span className="switch-thumb" aria-hidden="true" />
                    </span>
                  </div>
                );
              })}

              <p className="demo-note" style={{ marginTop: 16 }}>
                <span aria-hidden="true">ℹ️</span>
                <span>
                  <strong>Prototype build.</strong> Settings are saved to your account and kept
                  when you sign back in.
                </span>
              </p>
            </div>
          </section>
        </div>

        <div>
          <section className="card" aria-labelledby="summary-heading">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="summary-heading">Your attendance</h2>
                <p className="card-sub">Last 30 days · your records only</p>
              </div>
            </div>
            <div className="card-body">
              <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <StatCard label="Planned" value={summary.mealsPlanned} icon="🍽️" />
                <StatCard label="Attended" value={summary.mealsAttended} icon="✓" accent="green" />
                <StatCard label="Skipped" value={summary.mealsSkipped} icon="✕" />
                <StatCard label="No response" value={summary.noResponse} icon="?" accent="amber" />
              </div>

              <div style={{ marginTop: 16 }}>
                <p className="stat-label">Attendance rate</p>
                <p className="stat-value">{summary.attendanceRate}%</p>
                <div className="meter">
                  <div className="meter-fill" style={{ width: `${summary.attendanceRate}%` }} />
                </div>
                <p className="stat-hint">Share of the meals you planned that were recorded.</p>
              </div>
            </div>
          </section>

          <section className="card" style={{ marginTop: 18 }} aria-labelledby="session-heading">
            <div className="card-head">
              <h2 className="card-title" id="session-heading">Session</h2>
            </div>
            <div className="card-body">
              <button type="button" className="btn btn-secondary btn-block" onClick={handleLogout}>
                <span aria-hidden="true">⏻</span> Log out
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
