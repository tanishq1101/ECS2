/**
 * Student sign-in.
 *
 * Shares the auth context and the /api/auth/login endpoint with the mess-staff
 * page — the role in the response decides where the session lands, so there is
 * only ever one authentication system. Mess-staff credentials are never shown
 * on this page.
 */

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homePathForRole, useAuth } from '../context/AuthContext';
import '../styles/login.css';

export default function LoginStudent() {
  const { login, isAuthenticated, role, bootstrapping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in: go straight to whichever portal this account belongs to.
  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (formError) setFormError('');
  }

  function validate() {
    const errors = {};
    if (!form.email.trim()) errors.email = 'Enter your email address or student ID.';
    if (!form.password) errors.password = 'Enter your password.';
    else if (form.password.length < 4) errors.password = 'Passwords are at least 4 characters.';
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await login(form.email.trim(), form.password);
      // A staff account signing in here is still routed by its own role.
      const target = location.state?.from && user.role === 'student'
        ? location.state.from
        : homePathForRole(user.role);
      navigate(target, { replace: true });
    } catch (error) {
      setFormError(error.message || 'Could not sign you in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-head">
          <span className="brand-mark" aria-hidden="true">🍃</span>
          <span className="brand-text">
            <span className="brand-name">Smart Mess</span>
            <span className="brand-sub">Smart Food Wastage Analyser</span>
          </span>
        </div>

        <div className="login-pitch">
          <h2>Tell the mess whether you&apos;re eating.</h2>
          <p>
            Your meal response gives the kitchen a headcount to plan around, so less food is
            prepared than gets thrown away. It takes one tap per meal.
          </p>

          <div className="login-flow" aria-hidden="true">
            <span className="flow-step">1 · Indicate intent</span>
            <span className="flow-step">2 · Scan at the mess</span>
            <span className="flow-step">3 · Attendance recorded</span>
            <span className="flow-step">4 · Kitchen plans ahead</span>
          </div>
        </div>

        <p className="login-foot">
          Prototype build · your meal responses are saved to a database · fingerprint hardware
          and the ML model are not connected yet.
        </p>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <span className="login-eyebrow">
            <span aria-hidden="true">🎓</span> Student sign-in
          </span>

          <h1>Welcome back</h1>
          <p className="login-lede">Sign in to plan your meals for today and tomorrow.</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {formError && (
              <p className="login-alert" role="alert">
                <span aria-hidden="true">⚠️</span>
                {formError}
              </p>
            )}

            <div className="field">
              <label htmlFor="email">Email or student ID</label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                placeholder="you@smartmess.demo or 24BCE1187"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                disabled={submitting}
              />
              {fieldErrors.email && (
                <p className="field-error" id="email-error">
                  <span aria-hidden="true">•</span> {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                disabled={submitting}
              />
              {fieldErrors.password && (
                <p className="field-error" id="password-error">
                  <span aria-hidden="true">•</span> {fieldErrors.password}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-accent btn-block" disabled={submitting}>
              {submitting && <span className="spinner spinner-sm" aria-hidden="true" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="login-hint">
              Hostel accounts are issued by the mess office. Contact them if you cannot sign in.
            </p>
          </form>

          <div className="demo-creds">
            <p className="demo-creds-title">Demo student account</p>
            <p className="demo-creds-row">
              <span>Email</span> <code>student.demo@smartmess.demo</code>
            </p>
            <p className="demo-creds-row">
              <span>Password</span> <code>Student@123</code>
            </p>
          </div>

          <p className="login-switch">
            Mess staff? <Link to="/admin/login">Go to the staff dashboard sign-in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
