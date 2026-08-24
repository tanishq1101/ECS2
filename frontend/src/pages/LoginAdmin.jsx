/**
 * Mess staff sign-in. Same auth context and endpoint as the student page; only
 * the framing and the demo credentials shown differ.
 */

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { homePathForRole, useAuth } from '../context/AuthContext';
import '../styles/login.css';

export default function LoginAdmin() {
  const { login, isAuthenticated, role, bootstrapping } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (formError) setFormError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = {};
    if (!form.email.trim()) errors.email = 'Enter your staff email address.';
    if (!form.password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await login(form.email.trim(), form.password);
      navigate(homePathForRole(user.role), { replace: true });
    } catch (error) {
      setFormError(error.message || 'Could not sign you in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand-panel is-staff">
        <div className="login-brand-head">
          <span className="brand-mark" aria-hidden="true" style={{ background: 'var(--navy-600)' }}>
            📊
          </span>
          <span className="brand-text">
            <span className="brand-name">Smart Mess</span>
            <span className="brand-sub">Mess staff dashboard</span>
          </span>
        </div>

        <div className="login-pitch">
          <h2>Plan preparation around real demand.</h2>
          <p>
            Student meal responses, recorded attendance and expected headcount in one place, so the
            kitchen can cook closer to what will actually be eaten.
          </p>
        </div>

        <p className="login-foot">
          Prototype build · demo data only · no database, fingerprint hardware or ML model is
          connected yet.
        </p>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <span className="login-eyebrow is-staff">
            <span aria-hidden="true">🔑</span> Staff sign-in
          </span>

          <h1>Mess staff dashboard</h1>
          <p className="login-lede">Sign in with your mess office account.</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {formError && (
              <p className="login-alert" role="alert">
                <span aria-hidden="true">⚠️</span>
                {formError}
              </p>
            )}

            <div className="field">
              <label htmlFor="staff-email">Staff email</label>
              <input
                id="staff-email"
                type="text"
                autoComplete="username"
                placeholder="name@smartmess.demo"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                aria-describedby={fieldErrors.email ? 'staff-email-error' : undefined}
                disabled={submitting}
              />
              {fieldErrors.email && (
                <p className="field-error" id="staff-email-error">
                  <span aria-hidden="true">•</span> {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="staff-password">Password</label>
              <input
                id="staff-password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby={fieldErrors.password ? 'staff-password-error' : undefined}
                disabled={submitting}
              />
              {fieldErrors.password && (
                <p className="field-error" id="staff-password-error">
                  <span aria-hidden="true">•</span> {fieldErrors.password}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting && <span className="spinner spinner-sm" aria-hidden="true" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-creds">
            <p className="demo-creds-title">Demo staff account</p>
            <p className="demo-creds-row">
              <span>Email</span> <code>mess.admin@smartmess.demo</code>
            </p>
            <p className="demo-creds-row">
              <span>Password</span> <code>Mess@123</code>
            </p>
          </div>

          <p className="login-switch">
            Student? <Link to="/login">Go to the student portal sign-in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
