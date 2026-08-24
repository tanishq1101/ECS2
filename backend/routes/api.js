/**
 * Smart Food Wastage Analyser — API routes.
 *
 * Two role-scoped groups share one auth layer:
 *   /api/...          shared or mess-staff endpoints (existing admin portal)
 *   /api/student/...  student portal endpoints
 *
 * Every handler reads from mockData.js. No data is defined in this file, so the
 * whole prototype can be pointed at a real database by editing that one module.
 */

const express = require('express');
const data = require('../mockData');
const { login, logout, requireAuth, requireRole } = require('../auth');

const router = express.Router();

const VALID_INTENTS = ['attending', 'not_attending', 'none'];

/* ------------------------------------------------------------------ *
 * Auth (shared by both portals)
 * ------------------------------------------------------------------ */

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'missing_credentials',
      message: 'Enter your email or student ID and your password.',
    });
  }

  const session = login(email, password);
  if (!session) {
    return res.status(401).json({
      error: 'invalid_credentials',
      message: 'Those credentials do not match an account. Please check and try again.',
    });
  }

  // The role in this response is what drives redirection in the frontend.
  return res.json(session);
});

router.post('/auth/logout', requireAuth, (req, res) => {
  logout(req.token);
  res.json({ ok: true });
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ------------------------------------------------------------------ *
 * Shared profile
 * ------------------------------------------------------------------ */

router.get('/profile', requireAuth, (req, res) => {
  res.json({ profile: req.user });
});

/* ------------------------------------------------------------------ *
 * Student portal
 * ------------------------------------------------------------------ */

const studentOnly = [requireAuth, requireRole('student')];

/**
 * GET /api/student/meals
 * Today's and tomorrow's meals from this student's point of view, including
 * their own intent and their own attendance status.
 */
router.get('/student/meals', ...studentOnly, (req, res) => {
  const today = new Date();
  const tomorrow = data.addDays(today, 1);

  res.json({
    today: {
      date: data.toDateKey(today),
      label: 'Today',
      meals: data.getMealsForDate(req.user.id, today),
    },
    tomorrow: {
      date: data.toDateKey(tomorrow),
      label: 'Tomorrow',
      meals: data.getMealsForDate(req.user.id, tomorrow),
    },
    // Honest about what is and is not wired up yet.
    demoMode: true,
  });
});

/**
 * POST /api/student/meals/:mealId/intent
 * Body: { intent: 'attending' | 'not_attending' | 'none', date?: 'YYYY-MM-DD' }
 * This is the single write the student portal makes — the same record that will
 * later feed the attendance database and the ML model's training set.
 */
router.post('/student/meals/:mealId/intent', ...studentOnly, (req, res) => {
  const { mealId } = req.params;
  const { intent, date } = req.body || {};

  if (!VALID_INTENTS.includes(intent)) {
    return res.status(400).json({
      error: 'invalid_intent',
      message: 'Intent must be attending, not_attending or none.',
    });
  }

  const dateKey = date || data.toDateKey(new Date());
  const result = data.setMealIntent(req.user.id, dateKey, mealId, intent);

  if (result.error === 'unknown_meal') {
    return res.status(404).json({ error: 'unknown_meal', message: 'That meal does not exist.' });
  }
  if (result.error === 'cutoff_passed') {
    return res.status(409).json({
      error: 'cutoff_passed',
      message: 'The cutoff for this meal has passed, so responses are closed.',
    });
  }

  // Return the refreshed meal so the UI can update from server truth.
  const [y, m, d] = dateKey.split('-').map(Number);
  const meals = data.getMealsForDate(req.user.id, new Date(y, m - 1, d));
  return res.json({ ok: true, meal: meals.find((meal) => meal.id === mealId) });
});

/**
 * GET /api/student/history?days=14
 * Past intent vs verified attendance, plus summary stats and a daily trend.
 */
router.get('/student/history', ...studentOnly, (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 30);
  const records = data.getHistory(req.user.id, days);

  res.json({
    days,
    records,
    summary: data.summariseHistory(records),
    trend: data.historyTrend(records, 7),
  });
});

router.get('/student/notifications', ...studentOnly, (req, res) => {
  const notifications = data.getNotifications(req.user.id);
  res.json({
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  });
});

/** :id accepts a notification id, or "all" to clear the whole list. */
router.post('/student/notifications/:id/read', ...studentOnly, (req, res) => {
  const ok = data.markNotification(req.user.id, req.params.id, req.body?.read !== false);
  if (!ok) {
    return res.status(404).json({ error: 'not_found', message: 'Notification not found.' });
  }
  const notifications = data.getNotifications(req.user.id);
  return res.json({ ok: true, notifications, unreadCount: notifications.filter((n) => !n.read).length });
});

/**
 * GET /api/student/profile
 * Account details plus the student's own attendance summary. Deliberately
 * carries no mess-wide totals, predictions or kitchen data.
 */
router.get('/student/profile', ...studentOnly, (req, res) => {
  const records = data.getHistory(req.user.id, 30);

  res.json({
    profile: req.user,
    summary: data.summariseHistory(records),
    preferences: data.getPreferences(req.user.id),
  });
});

/** Prototype: preferences persist for the lifetime of the server process only. */
router.patch('/student/preferences', ...studentOnly, (req, res) => {
  res.json({ ok: true, preferences: data.setPreferences(req.user.id, req.body || {}) });
});

/* ------------------------------------------------------------------ *
 * Mess staff / admin portal
 * ------------------------------------------------------------------ */

const adminOnly = [requireAuth, requireRole('admin')];

router.get('/dashboard/summary', ...adminOnly, (req, res) => {
  const meals = data.adminMealSnapshot();
  const responded = meals.reduce((sum, m) => sum + m.attending + m.notAttending, 0);
  const totalPossible = data.messTotals.registeredStudents * meals.length;

  res.json({
    registeredStudents: data.messTotals.registeredStudents,
    responseRate: Math.round((responded / totalPossible) * 100),
    expectedToday: meals.reduce((sum, m) => sum + m.attending, 0),
    wasteThisWeekKg: data.wasteTrend.reduce((sum, d) => sum + d.wastedKg, 0).toFixed(1),
    meals,
  });
});

router.get('/meals/today', ...adminOnly, (req, res) => {
  res.json({ date: data.toDateKey(new Date()), meals: data.adminMealSnapshot() });
});

router.get('/predictions', ...adminOnly, (req, res) => {
  res.json({
    predictions: data.predictions,
    // The model is not built yet; say so rather than implying live inference.
    modelStatus: 'not_connected',
    note: 'Placeholder values. No ML model is connected in prototype mode.',
  });
});

router.get('/attendance', ...adminOnly, (req, res) => {
  res.json({
    records: data.attendanceLog,
    source: 'demo',
    note: 'Demo records. No fingerprint hardware is connected in prototype mode.',
  });
});

router.get('/analytics', ...adminOnly, (req, res) => {
  res.json({ wasteTrend: data.wasteTrend, meals: data.adminMealSnapshot() });
});

module.exports = router;
