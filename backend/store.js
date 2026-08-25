/**
 * Smart Food Wastage Analyser — data access layer.
 *
 * Every accessor here used to read from an in-memory Map; each one now runs a
 * SQL query against SQLite (see db/schema.sql). The signatures and the returned
 * shapes are unchanged, which is why routes/api.js and the whole React frontend
 * needed no edits when the database landed.
 *
 * This is the only module in the backend that writes SQL.
 *
 * Still placeholder, and clearly labelled as such in the UI:
 *   messTotals / predictions / wasteTrend / attendanceLog
 *     — mess-wide aggregates that belong to the ML and fingerprint phases.
 *       Everything a student sees about themselves is real, persisted data.
 */

const { db } = require('./db');
const { seedReferenceData, seedDemoHistory } = require('./db/seed');

const MINUTE = 60 * 1000;

/* ------------------------------------------------------------------ *
 * Date helpers
 * ------------------------------------------------------------------ */

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minutesNow(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

function atMinutes(dateKey, mins) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(mins / 60), mins % 60, 0, 0);
}

/* ------------------------------------------------------------------ *
 * Startup
 * ------------------------------------------------------------------ */

seedReferenceData();
seedDemoHistory({ toDateKey, addDays, atMinutes, minutesNow });

/* ------------------------------------------------------------------ *
 * Accounts (used by auth.js)
 * ------------------------------------------------------------------ */

// Selected explicitly so password_hash can never leave this module by accident.
const USER_COLUMNS = `
  id, role, name, email, designation, mess,
  student_id AS studentId, hostel, room, program, year,
  mess_plan AS messPlan, joined_on AS joinedOn
`;

// Drops the columns that are null for this role, so a student profile does not
// carry empty staff fields and vice versa.
function shapeUser(row) {
  if (!row) return null;
  const user = {};
  Object.entries(row).forEach(([k, v]) => {
    if (v !== null) user[k] = v;
  });
  return user;
}

const findUserRowByLoginStmt = db.prepare(`
  SELECT ${USER_COLUMNS}, password_hash AS passwordHash
  FROM users
  WHERE lower(email) = ? OR lower(student_id) = ?
`);

/** Looks a user up by email or student ID. Includes the hash — auth.js only. */
function findUserForLogin(identifier) {
  const needle = String(identifier || '').trim().toLowerCase();
  if (!needle) return null;
  const row = findUserRowByLoginStmt.get(needle, needle);
  if (!row) return null;
  const { passwordHash, ...rest } = row;
  return { passwordHash, user: shapeUser(rest) };
}

const getUserByIdStmt = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`);

function getUserById(id) {
  return shapeUser(getUserByIdStmt.get(id));
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ *
 * In the database rather than a process-local Map, so restarting the API no
 * longer signs every open tab out.
 */

const createSessionStmt = db.prepare(
  'INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
);
const deleteSessionStmt = db.prepare('DELETE FROM sessions WHERE token = ?');
const userForSessionStmt = db.prepare(`
  SELECT
    u.id, u.role, u.name, u.email, u.designation, u.mess,
    u.student_id AS studentId, u.hostel, u.room, u.program, u.year,
    u.mess_plan AS messPlan, u.joined_on AS joinedOn
  FROM sessions s JOIN users u ON u.id = s.user_id
  WHERE s.token = ?
`);

function createSession(token, userId) {
  createSessionStmt.run(token, userId, new Date().toISOString());
}

function deleteSession(token) {
  return deleteSessionStmt.run(token).changes > 0;
}

function userForSession(token) {
  if (!token) return null;
  return shapeUser(userForSessionStmt.get(token));
}

/* ------------------------------------------------------------------ *
 * Meals and menu
 * ------------------------------------------------------------------ */

const listMealsStmt = db.prepare('SELECT * FROM meals ORDER BY sort_order');
const getMealStmt = db.prepare('SELECT * FROM meals WHERE id = ?');
const menuForDayStmt = db.prepare(`
  SELECT meal_id, item FROM menu_items WHERE day_of_week = ? ORDER BY meal_id, position
`);

/** { breakfast: [...items], lunch: [...], dinner: [...] } for a JS day-of-week. */
function menuForDay(dayOfWeek) {
  const menu = {};
  menuForDayStmt.all(dayOfWeek).forEach(({ meal_id: mealId, item }) => {
    (menu[mealId] = menu[mealId] || []).push(item);
  });
  return menu;
}

/** Meal definitions in camelCase, for anything outside this module. */
function getMealDefinitions() {
  return listMealsStmt.all().map((m) => ({
    id: m.id,
    name: m.name,
    window: m.time_window,
    startMin: m.start_min,
    endMin: m.end_min,
    cutoffMin: m.cutoff_min,
    cutoffLabel: m.cutoff_label,
  }));
}

const mealsForDateStmt = db.prepare(`
  SELECT
    m.id, m.name, m.time_window, m.start_min, m.end_min, m.cutoff_min, m.cutoff_label,
    i.intent            AS intent,
    i.updated_at        AS intentUpdatedAt,
    a.status            AS attendanceStatus,
    a.source            AS attendanceSource,
    a.verified_at       AS attendanceVerifiedAt
  FROM meals m
  LEFT JOIN meal_intents i
    ON i.meal_id = m.id AND i.student_id = @studentId AND i.meal_date = @dateKey
  LEFT JOIN attendance a
    ON a.meal_id = m.id AND a.student_id = @studentId AND a.meal_date = @dateKey
  ORDER BY m.sort_order
`);

/**
 * Builds the meal list for one date from the student's point of view — menu,
 * timing, cutoff, their own intent and their own attendance in one shape.
 */
function getMealsForDate(studentId, date) {
  const dateKey = toDateKey(date);
  const menu = menuForDay(date.getDay());
  const now = new Date();
  const todayKey = toDateKey(now);
  const isToday = dateKey === todayKey;
  const isPast = dateKey < todayKey;
  const nowMin = minutesNow(now);

  return mealsForDateStmt.all({ studentId, dateKey }).map((row) => {
    const cutoffAt = atMinutes(dateKey, row.cutoff_min);

    let status = 'upcoming';
    if (isPast) status = 'completed';
    else if (isToday) {
      if (nowMin >= row.end_min) status = 'completed';
      else if (nowMin >= row.start_min) status = 'serving';
    }

    return {
      id: row.id,
      name: row.name,
      date: dateKey,
      time: row.time_window,
      cutoffLabel: row.cutoff_label,
      cutoffAt: cutoffAt.toISOString(),
      // Intent editing closes at the cutoff; future dates are always open.
      intentOpen: now.getTime() < cutoffAt.getTime(),
      menu: menu[row.id] || [],
      status,
      studentIntent: row.intent || 'none',
      intentUpdatedAt: row.intentUpdatedAt,
      attendanceStatus: row.attendanceStatus || 'none',
      attendanceSource: row.attendanceSource,
      attendanceVerifiedAt: row.attendanceVerifiedAt,
    };
  });
}

const upsertIntentStmt = db.prepare(`
  INSERT INTO meal_intents (student_id, meal_date, meal_id, intent, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (student_id, meal_date, meal_id)
  DO UPDATE SET intent = excluded.intent, updated_at = excluded.updated_at
`);

/**
 * Records a student's meal intention. Returns an `error` for an unknown meal or
 * a passed cutoff, so the route layer can answer 404 / 409.
 */
function setMealIntent(studentId, dateKey, mealId, intent) {
  const meal = getMealStmt.get(mealId);
  if (!meal) return { error: 'unknown_meal' };

  const cutoffAt = atMinutes(dateKey, meal.cutoff_min);
  if (Date.now() >= cutoffAt.getTime()) return { error: 'cutoff_passed' };

  upsertIntentStmt.run(studentId, dateKey, mealId, intent, new Date().toISOString());
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * History
 * ------------------------------------------------------------------ */

// A row appears if EITHER an intent or an attendance record exists for that
// meal, which is why the two tables are unioned before being joined back.
const historyStmt = db.prepare(`
  WITH slots AS (
    SELECT meal_date, meal_id FROM meal_intents
      WHERE student_id = @studentId AND meal_date BETWEEN @from AND @to
    UNION
    SELECT meal_date, meal_id FROM attendance
      WHERE student_id = @studentId AND meal_date BETWEEN @from AND @to
  )
  SELECT
    s.meal_date                     AS date,
    s.meal_id                       AS mealId,
    m.name                          AS meal,
    COALESCE(i.intent, 'none')      AS intent,
    COALESCE(a.status, 'none')      AS attendanceStatus,
    a.source                        AS attendanceSource
  FROM slots s
  JOIN meals m ON m.id = s.meal_id
  LEFT JOIN meal_intents i
    ON i.student_id = @studentId AND i.meal_date = s.meal_date AND i.meal_id = s.meal_id
  LEFT JOIN attendance a
    ON a.student_id = @studentId AND a.meal_date = s.meal_date AND a.meal_id = s.meal_id
  ORDER BY s.meal_date DESC, m.sort_order
`);

/** Past meals only — today is still in progress, so it is excluded. */
function getHistory(studentId, days = 14) {
  const today = new Date();
  const rows = historyStmt.all({
    studentId,
    from: toDateKey(addDays(today, -days)),
    to: toDateKey(addDays(today, -1)),
  });

  return rows.map((row) => ({ id: `${row.date}-${row.mealId}`, ...row }));
}

function summariseHistory(rows) {
  const planned = rows.filter((r) => r.intent === 'attending').length;
  const skipped = rows.filter((r) => r.intent === 'not_attending').length;
  const attended = rows.filter((r) => r.attendanceStatus === 'verified').length;
  const noResponse = rows.filter((r) => r.intent === 'none').length;

  return {
    mealsPlanned: planned,
    mealsAttended: attended,
    mealsSkipped: skipped,
    noResponse,
    // Share of meals the student planned that they actually turned up for.
    attendanceRate: planned ? Math.round((attended / planned) * 100) : 0,
    totalRecords: rows.length,
  };
}

/** Per-day series for the student history chart (oldest first). */
function historyTrend(rows, days = 7) {
  const byDate = new Map();
  rows.forEach((row) => {
    if (!byDate.has(row.date)) byDate.set(row.date, { date: row.date, planned: 0, attended: 0 });
    const bucket = byDate.get(row.date);
    if (row.intent === 'attending') bucket.planned += 1;
    if (row.attendanceStatus === 'verified') bucket.attended += 1;
  });

  return Array.from(byDate.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-days);
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

// minutes_ago is resolved against "now" on every read, so demo timestamps stay
// fresh however long the database has existed.
const notificationsStmt = db.prepare(`
  SELECT n.id, n.type, n.title, n.body, n.minutes_ago AS minutesAgo,
         COALESCE(r.is_read, n.default_read) AS isRead
  FROM notifications n
  LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.student_id = ?
  ORDER BY n.sort_order
`);

function getNotifications(studentId) {
  return notificationsStmt.all(studentId).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: new Date(Date.now() - n.minutesAgo * MINUTE).toISOString(),
    read: Boolean(n.isRead),
  }));
}

const markOneStmt = db.prepare(`
  INSERT INTO notification_reads (student_id, notification_id, is_read)
  VALUES (?, ?, ?)
  ON CONFLICT (student_id, notification_id) DO UPDATE SET is_read = excluded.is_read
`);
const markAllStmt = db.prepare(`
  INSERT INTO notification_reads (student_id, notification_id, is_read)
  SELECT ?, id, ? FROM notifications
  WHERE true
  ON CONFLICT (student_id, notification_id) DO UPDATE SET is_read = excluded.is_read
`);
const notificationExistsStmt = db.prepare('SELECT 1 FROM notifications WHERE id = ?');

/** `notificationId` accepts an id, or "all" to mark the whole list. */
function markNotification(studentId, notificationId, read = true) {
  if (notificationId === 'all') {
    markAllStmt.run(studentId, read ? 1 : 0);
    return true;
  }
  if (!notificationExistsStmt.get(notificationId)) return false;
  markOneStmt.run(studentId, notificationId, read ? 1 : 0);
  return true;
}

/* ------------------------------------------------------------------ *
 * Student preferences
 * ------------------------------------------------------------------ */

const DEFAULT_PREFERENCES = {
  notificationsEnabled: true,
  mealReminders: true,
  cutoffReminders: true,
  menuUpdates: false,
};

const getPreferencesStmt = db.prepare(`
  SELECT notifications_enabled AS notificationsEnabled,
         meal_reminders        AS mealReminders,
         cutoff_reminders      AS cutoffReminders,
         menu_updates          AS menuUpdates
  FROM preferences WHERE student_id = ?
`);

const upsertPreferencesStmt = db.prepare(`
  INSERT INTO preferences
    (student_id, notifications_enabled, meal_reminders, cutoff_reminders, menu_updates)
  VALUES (@studentId, @notificationsEnabled, @mealReminders, @cutoffReminders, @menuUpdates)
  ON CONFLICT (student_id) DO UPDATE SET
    notifications_enabled = excluded.notifications_enabled,
    meal_reminders        = excluded.meal_reminders,
    cutoff_reminders      = excluded.cutoff_reminders,
    menu_updates          = excluded.menu_updates
`);

function getPreferences(studentId) {
  const row = getPreferencesStmt.get(studentId);
  if (!row) return { ...DEFAULT_PREFERENCES };

  // SQLite has no boolean type — 0/1 come back as numbers.
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Boolean(v)]));
}

/** Ignores unknown keys and non-booleans, so a bad body cannot corrupt a row. */
function setPreferences(studentId, patch) {
  const next = { ...getPreferences(studentId) };
  Object.keys(DEFAULT_PREFERENCES).forEach((k) => {
    if (typeof patch[k] === 'boolean') next[k] = patch[k];
  });

  upsertPreferencesStmt.run({
    studentId,
    notificationsEnabled: next.notificationsEnabled ? 1 : 0,
    mealReminders: next.mealReminders ? 1 : 0,
    cutoffReminders: next.cutoffReminders ? 1 : 0,
    menuUpdates: next.menuUpdates ? 1 : 0,
  });
  return next;
}

/* ------------------------------------------------------------------ *
 * Mess staff / admin data
 * ------------------------------------------------------------------ *
 * PLACEHOLDERS. These are mess-wide numbers for a 486-student mess, which the
 * two demo accounts obviously cannot produce. They belong to the ML and
 * fingerprint phases, and every screen that shows them says so.
 */

const messTotals = { registeredStudents: 486, respondedToday: 341 };

// A fixed response profile per meal, not a live tally of the tables above.
const ADMIN_RESPONSE_PROFILE = {
  breakfast: { attending: 268, notAttending: 74, prepared: 280, served: 254 },
  lunch: { attending: 392, notAttending: 41, prepared: 410, served: 0 },
  dinner: { attending: 187, notAttending: 63, prepared: 0, served: 0 },
};

function adminMealSnapshot() {
  const today = new Date();
  const dateKey = toDateKey(today);
  const menu = menuForDay(today.getDay());
  const nowMin = minutesNow(today);

  return listMealsStmt.all().map((meal) => {
    let status = 'upcoming';
    if (nowMin >= meal.end_min) status = 'completed';
    else if (nowMin >= meal.start_min) status = 'serving';

    const profile = ADMIN_RESPONSE_PROFILE[meal.id];

    return {
      id: meal.id,
      name: meal.name,
      date: dateKey,
      time: meal.time_window,
      cutoffLabel: meal.cutoff_label,
      menu: menu[meal.id] || [],
      status,
      ...profile,
      noResponse: messTotals.registeredStudents - profile.attending - profile.notAttending,
    };
  });
}

// Shaped like the future Python model's response; modelStatus stays
// 'not_connected' until one is actually wired up.
const predictions = [
  { mealId: 'breakfast', meal: 'Breakfast', predictedHeadcount: 271, confidence: 0.88,
    recommendedPortions: 285, drivers: ['Weekday pattern', 'Response rate 71%', 'No exam window'] },
  { mealId: 'lunch', meal: 'Lunch', predictedHeadcount: 398, confidence: 0.91,
    recommendedPortions: 415, drivers: ['Popular menu item', 'High response rate', 'Weekday pattern'] },
  { mealId: 'dinner', meal: 'Dinner', predictedHeadcount: 203, confidence: 0.74,
    recommendedPortions: 220, drivers: ['Weekend outflow', 'Low response rate so far'] },
];

const wasteTrend = [
  { day: 'Mon', prepared: 1080, served: 968, wastedKg: 14.2 },
  { day: 'Tue', prepared: 1065, served: 981, wastedKg: 11.8 },
  { day: 'Wed', prepared: 1042, served: 972, wastedKg: 9.6 },
  { day: 'Thu', prepared: 1030, served: 964, wastedKg: 9.1 },
  { day: 'Fri', prepared: 1110, served: 1038, wastedKg: 10.4 },
  { day: 'Sat', prepared: 880, served: 792, wastedKg: 12.7 },
  { day: 'Sun', prepared: 845, served: 774, wastedKg: 10.9 },
];

const attendanceLog = [
  { id: 'a-1', studentId: '24BCE1187', name: 'Ved Kamath', meal: 'Breakfast', time: '08:12 AM', method: 'demo', status: 'verified' },
  { id: 'a-2', studentId: '24BCE1042', name: 'Aarav Menon', meal: 'Breakfast', time: '08:19 AM', method: 'demo', status: 'verified' },
  { id: 'a-3', studentId: '24BCE0918', name: 'Ishita Rao', meal: 'Breakfast', time: '08:41 AM', method: 'demo', status: 'verified' },
  { id: 'a-4', studentId: '24BCE1204', name: 'Nikhil Shetty', meal: 'Breakfast', time: '09:02 AM', method: 'demo', status: 'verified' },
  { id: 'a-5', studentId: '24BCE0776', name: 'Meera Iyer', meal: 'Breakfast', time: '09:15 AM', method: 'demo', status: 'verified' },
];

module.exports = {
  // accounts + sessions (auth.js)
  findUserForLogin,
  getUserById,
  createSession,
  deleteSession,
  userForSession,

  // date helpers
  toDateKey,
  addDays,

  // student data
  getMealDefinitions,
  getMealsForDate,
  setMealIntent,
  getHistory,
  summariseHistory,
  historyTrend,
  getNotifications,
  markNotification,
  getPreferences,
  setPreferences,

  // admin placeholders
  messTotals,
  predictions,
  wasteTrend,
  attendanceLog,
  adminMealSnapshot,
};
