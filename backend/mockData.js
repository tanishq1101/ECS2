/**
 * Smart Food Wastage Analyser — centralized mock data layer.
 *
 * DEMO / PROTOTYPE MODE
 * --------------------
 * There is no database, no ESP32 fingerprint hardware and no ML service behind
 * this file yet. Every export below is shaped the way a real persistence layer
 * would return it, so each accessor can later be swapped for a SQL query or a
 * service call without touching the route handlers or the React frontend.
 *
 * Replacement map for later:
 *   users / students        -> `users`, `students` tables
 *   getMealsForDate()       -> `meals` JOIN `menus` for a date
 *   intents store           -> `meal_intents` (student_id, meal_date, meal_id)
 *   attendance store        -> `attendance` rows written by the ESP32 endpoint
 *   history                 -> aggregate query over the two tables above
 */

const MINUTE = 60 * 1000;

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

// Demo credentials only. A real build would store password hashes.
const users = [
  {
    id: 'staff-01',
    role: 'admin',
    name: 'Ramesh Kulkarni',
    email: 'mess.admin@smartmess.demo',
    password: 'Mess@123',
    designation: 'Mess Supervisor',
    mess: 'Central Mess — Block A',
  },
  {
    id: 'stu-2024-1187',
    role: 'student',
    name: 'Ved Kamath',
    email: 'student.demo@smartmess.demo',
    password: 'Student@123',
    studentId: '24BCE1187',
    hostel: 'Nilgiri Hostel',
    room: 'B-214',
    program: 'B.Tech Computer Science',
    year: '2nd Year',
    messPlan: 'Full Plan (3 meals)',
    joinedOn: '2024-07-22',
  },
  {
    id: 'stu-2024-1042',
    role: 'student',
    name: 'Aarav Menon',
    email: 'aarav.menon@smartmess.demo',
    password: 'Student@123',
    studentId: '24BCE1042',
    hostel: 'Nilgiri Hostel',
    room: 'A-108',
    program: 'B.Tech Electronics',
    year: '2nd Year',
    messPlan: 'Full Plan (3 meals)',
    joinedOn: '2024-07-22',
  },
];

/* ------------------------------------------------------------------ *
 * Meal definitions
 * ------------------------------------------------------------------ */

// Minutes past midnight keep the time maths readable and timezone-free.
const MEAL_DEFINITIONS = [
  {
    id: 'breakfast',
    name: 'Breakfast',
    window: '7:30 AM – 9:30 AM',
    startMin: 7 * 60 + 30,
    endMin: 9 * 60 + 30,
    cutoffMin: 6 * 60 + 30,
    cutoffLabel: '6:30 AM',
  },
  {
    id: 'lunch',
    name: 'Lunch',
    window: '12:30 PM – 2:00 PM',
    startMin: 12 * 60 + 30,
    endMin: 14 * 60,
    cutoffMin: 10 * 60 + 30,
    cutoffLabel: '10:30 AM',
  },
  {
    id: 'dinner',
    name: 'Dinner',
    window: '7:30 PM – 9:30 PM',
    startMin: 19 * 60 + 30,
    endMin: 21 * 60 + 30,
    cutoffMin: 17 * 60 + 30,
    cutoffLabel: '5:30 PM',
  },
];

// Weekly menu rotation, indexed by JS day-of-week (0 = Sunday).
const WEEKLY_MENU = {
  0: {
    breakfast: ['Poha', 'Sev & Chopped Onion', 'Boiled Eggs', 'Banana', 'Tea / Coffee'],
    lunch: ['Jeera Rice', 'Rajma Masala', 'Aloo Gobi', 'Curd', 'Green Salad', 'Gulab Jamun'],
    dinner: ['Chapati', 'Paneer Butter Masala', 'Dal Fry', 'Steamed Rice', 'Papad'],
  },
  1: {
    breakfast: ['Idli', 'Sambar', 'Coconut Chutney', 'Boiled Eggs', 'Tea / Coffee'],
    lunch: ['Steamed Rice', 'Dal Tadka', 'Bhindi Masala', 'Chapati', 'Curd', 'Salad'],
    dinner: ['Chapati', 'Chana Masala', 'Mixed Vegetable', 'Steamed Rice', 'Rasam'],
  },
  2: {
    breakfast: ['Masala Dosa', 'Sambar', 'Tomato Chutney', 'Fruit Bowl', 'Tea / Coffee'],
    lunch: ['Veg Pulao', 'Dal Makhani', 'Aloo Matar', 'Curd', 'Salad', 'Fryums'],
    dinner: ['Chapati', 'Egg Curry / Soya Curry', 'Cabbage Poriyal', 'Steamed Rice', 'Dal'],
  },
  3: {
    breakfast: ['Aloo Paratha', 'Curd', 'Pickle', 'Boiled Eggs', 'Tea / Coffee'],
    lunch: ['Steamed Rice', 'Sambar', 'Beans Thoran', 'Chapati', 'Curd', 'Payasam'],
    dinner: ['Chapati', 'Kadai Paneer', 'Yellow Dal', 'Jeera Rice', 'Green Salad'],
  },
  4: {
    breakfast: ['Upma', 'Coconut Chutney', 'Sprouts Salad', 'Banana', 'Tea / Coffee'],
    lunch: ['Steamed Rice', 'Dal Palak', 'Aloo Jeera', 'Chapati', 'Curd', 'Salad'],
    dinner: ['Chapati', 'Veg Kofta', 'Dal Tadka', 'Steamed Rice', 'Papad'],
  },
  5: {
    breakfast: ['Puri', 'Aloo Sabzi', 'Boiled Eggs', 'Fruit Bowl', 'Tea / Coffee'],
    lunch: ['Veg Biryani', 'Mirchi Ka Salan', 'Raita', 'Boiled Egg', 'Salad', 'Ice Cream'],
    dinner: ['Chapati', 'Mushroom Masala', 'Dal Fry', 'Steamed Rice', 'Rasam'],
  },
  6: {
    breakfast: ['Vermicelli Upma', 'Chutney', 'Boiled Eggs', 'Banana', 'Tea / Coffee'],
    lunch: ['Steamed Rice', 'Sambar', 'Cabbage Poriyal', 'Chapati', 'Curd', 'Salad'],
    dinner: ['Chapati', 'Chilli Paneer', 'Dal Makhani', 'Fried Rice', 'Soup'],
  },
};

/* ------------------------------------------------------------------ *
 * Mutable prototype stores
 * ------------------------------------------------------------------ *
 * `intents`    — what a student SAYS they will do (set from the portal).
 * `attendance` — what the hardware VERIFIES (will be written by the ESP32
 *                endpoint later; seeded here so the UI has something to show).
 * Both are keyed `${studentId}|${YYYY-MM-DD}|${mealId}` which maps one-to-one
 * onto a composite primary key in SQL.
 */
const intents = new Map();
const attendance = new Map();

const key = (studentId, date, mealId) => `${studentId}|${date}|${mealId}`;

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
 * Seeded history
 * ------------------------------------------------------------------ */

// Deterministic pseudo-random so the demo looks identical on every restart.
function seededPick(seed, options) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return options[h % options.length];
}

/**
 * Seeds ~3 weeks of realistic intent + attendance rows for every student, and
 * fills in today's already-finished meals so the dashboard is not empty.
 */
function seedHistory(days = 21) {
  const today = new Date();

  users
    .filter((u) => u.role === 'student')
    .forEach((student) => {
      for (let offset = days; offset >= 0; offset -= 1) {
        const date = addDays(today, -offset);
        const dateKey = toDateKey(date);

        MEAL_DEFINITIONS.forEach((meal) => {
          // Today is handled separately below — only past days are seeded here.
          if (offset === 0) return;

          const seed = `${student.id}-${dateKey}-${meal.id}`;
          const intent = seededPick(seed, [
            'attending', 'attending', 'attending', 'attending',
            'not_attending', 'none', 'attending', 'attending',
          ]);

          intents.set(key(student.id, dateKey, meal.id), {
            intent,
            updatedAt: atMinutes(dateKey, meal.cutoffMin - 45).toISOString(),
          });

          let status = 'none';
          if (intent === 'attending') {
            // Most planned meals are actually eaten; a few are missed.
            status = seededPick(`${seed}-att`, [
              'verified', 'verified', 'verified', 'verified',
              'verified', 'verified', 'not_verified', 'verified',
            ]);
          } else if (intent === 'none') {
            // Turning up without responding happens sometimes.
            status = seededPick(`${seed}-walkin`, ['none', 'verified', 'none']);
          }

          attendance.set(key(student.id, dateKey, meal.id), {
            status,
            source: status === 'verified' ? 'demo' : null,
            verifiedAt:
              status === 'verified'
                ? atMinutes(dateKey, meal.startMin + 20).toISOString()
                : null,
          });
        });
      }

      // Today: respond to (and verify) only the meals whose window has passed.
      const todayKey = toDateKey(today);
      const nowMin = minutesNow(today);

      MEAL_DEFINITIONS.forEach((meal) => {
        if (nowMin > meal.cutoffMin) {
          intents.set(key(student.id, todayKey, meal.id), {
            intent: 'attending',
            updatedAt: atMinutes(todayKey, meal.cutoffMin - 60).toISOString(),
          });
        }
        if (nowMin > meal.endMin) {
          attendance.set(key(student.id, todayKey, meal.id), {
            status: 'verified',
            source: 'demo',
            verifiedAt: atMinutes(todayKey, meal.startMin + 15).toISOString(),
          });
        }
      });
    });
}

seedHistory();

/* ------------------------------------------------------------------ *
 * Meal accessors
 * ------------------------------------------------------------------ */

/**
 * Builds the meal list for one date from the student's point of view.
 * Everything the student UI needs — menu, timing, cutoff, their own intent and
 * their own attendance — comes back in a single shape.
 */
function getMealsForDate(studentId, date) {
  const dateKey = toDateKey(date);
  const menu = WEEKLY_MENU[date.getDay()];
  const now = new Date();
  const isToday = dateKey === toDateKey(now);
  const isPast = dateKey < toDateKey(now);
  const nowMin = minutesNow(now);

  return MEAL_DEFINITIONS.map((meal) => {
    const cutoffAt = atMinutes(dateKey, meal.cutoffMin);
    const intentRecord = intents.get(key(studentId, dateKey, meal.id));
    const attendanceRecord = attendance.get(key(studentId, dateKey, meal.id));

    let status = 'upcoming';
    if (isPast) status = 'completed';
    else if (isToday) {
      if (nowMin >= meal.endMin) status = 'completed';
      else if (nowMin >= meal.startMin) status = 'serving';
    }

    return {
      id: meal.id,
      name: meal.name,
      date: dateKey,
      time: meal.window,
      cutoffLabel: meal.cutoffLabel,
      cutoffAt: cutoffAt.toISOString(),
      // Intent editing closes at the cutoff; future dates are always open.
      intentOpen: now.getTime() < cutoffAt.getTime(),
      menu: menu[meal.id],
      status,
      studentIntent: intentRecord ? intentRecord.intent : 'none',
      intentUpdatedAt: intentRecord ? intentRecord.updatedAt : null,
      attendanceStatus: attendanceRecord ? attendanceRecord.status : 'none',
      attendanceSource: attendanceRecord ? attendanceRecord.source : null,
      attendanceVerifiedAt: attendanceRecord ? attendanceRecord.verifiedAt : null,
    };
  });
}

/**
 * Records a student's meal intention. Returns null when the meal is unknown or
 * its cutoff has already passed, so the route layer can answer with 400/404.
 */
function setMealIntent(studentId, dateKey, mealId, intent) {
  const meal = MEAL_DEFINITIONS.find((m) => m.id === mealId);
  if (!meal) return { error: 'unknown_meal' };

  const cutoffAt = atMinutes(dateKey, meal.cutoffMin);
  if (Date.now() >= cutoffAt.getTime()) return { error: 'cutoff_passed' };

  intents.set(key(studentId, dateKey, mealId), {
    intent,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * History
 * ------------------------------------------------------------------ */

function getHistory(studentId, days = 14) {
  const today = new Date();
  const rows = [];

  for (let offset = 1; offset <= days; offset += 1) {
    const date = addDays(today, -offset);
    const dateKey = toDateKey(date);

    MEAL_DEFINITIONS.forEach((meal) => {
      const intentRecord = intents.get(key(studentId, dateKey, meal.id));
      const attendanceRecord = attendance.get(key(studentId, dateKey, meal.id));
      if (!intentRecord && !attendanceRecord) return;

      rows.push({
        id: `${dateKey}-${meal.id}`,
        date: dateKey,
        mealId: meal.id,
        meal: meal.name,
        intent: intentRecord ? intentRecord.intent : 'none',
        attendanceStatus: attendanceRecord ? attendanceRecord.status : 'none',
        attendanceSource: attendanceRecord ? attendanceRecord.source : null,
      });
    });
  }

  return rows;
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

// Offsets are minutes-ago so timestamps stay fresh on every server start.
const notificationSeeds = [
  { id: 'n-1', type: 'cutoff', title: 'Dinner response cutoff at 5:30 PM',
    body: 'Let the mess know whether you are eating dinner tonight so they can plan the right quantity.',
    minutesAgo: 25, read: false },
  { id: 'n-2', type: 'attendance', title: 'Lunch attendance recorded',
    body: 'Your lunch attendance was marked in the system. Fingerprint verification is simulated in demo mode.',
    minutesAgo: 180, read: false },
  { id: 'n-3', type: 'menu', title: 'Dinner menu updated',
    body: 'Tonight’s dinner now includes a soup counter. Check the meals page for the full menu.',
    minutesAgo: 320, read: false },
  { id: 'n-4', type: 'intent', title: 'Breakfast preference saved',
    body: 'You are marked as attending breakfast. You can change this until the 6:30 AM cutoff.',
    minutesAgo: 700, read: true },
  { id: 'n-5', type: 'reminder', title: 'Plan tomorrow’s meals',
    body: 'Responding a day ahead gives the kitchen the most accurate headcount to work with.',
    minutesAgo: 1500, read: true },
  { id: 'n-6', type: 'menu', title: 'Special meal on Friday',
    body: 'Friday lunch is Veg Biryani with ice cream. Please respond early so nothing is over-prepared.',
    minutesAgo: 2600, read: true },
];

// Read/unread lives per student so "mark as read" survives within a session.
const notificationState = new Map();

function getNotifications(studentId) {
  const overrides = notificationState.get(studentId) || {};
  return notificationSeeds.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: new Date(Date.now() - n.minutesAgo * MINUTE).toISOString(),
    read: overrides[n.id] !== undefined ? overrides[n.id] : n.read,
  }));
}

function markNotification(studentId, notificationId, read = true) {
  const overrides = notificationState.get(studentId) || {};
  if (notificationId === 'all') {
    notificationSeeds.forEach((n) => { overrides[n.id] = read; });
  } else {
    if (!notificationSeeds.some((n) => n.id === notificationId)) return false;
    overrides[notificationId] = read;
  }
  notificationState.set(studentId, overrides);
  return true;
}

/* ------------------------------------------------------------------ *
 * Student preferences (prototype: in-memory only)
 * ------------------------------------------------------------------ */

const preferences = new Map();
const DEFAULT_PREFERENCES = {
  notificationsEnabled: true,
  mealReminders: true,
  cutoffReminders: true,
  menuUpdates: false,
};

function getPreferences(studentId) {
  return { ...DEFAULT_PREFERENCES, ...(preferences.get(studentId) || {}) };
}

function setPreferences(studentId, patch) {
  const next = { ...getPreferences(studentId) };
  Object.keys(DEFAULT_PREFERENCES).forEach((k) => {
    if (typeof patch[k] === 'boolean') next[k] = patch[k];
  });
  preferences.set(studentId, next);
  return next;
}

/* ------------------------------------------------------------------ *
 * Mess staff / admin data
 * ------------------------------------------------------------------ *
 * Aggregated numbers the kitchen cares about. These stay on the admin side of
 * the API and are never served to a student session.
 */

const messTotals = { registeredStudents: 486, respondedToday: 341 };

function adminMealSnapshot() {
  const today = new Date();
  const dateKey = toDateKey(today);
  const menu = WEEKLY_MENU[today.getDay()];
  const nowMin = minutesNow(today);

  // Demo aggregates: a fixed response profile per meal, not a live tally.
  const profile = {
    breakfast: { attending: 268, notAttending: 74, prepared: 280, served: 254 },
    lunch: { attending: 392, notAttending: 41, prepared: 410, served: 0 },
    dinner: { attending: 187, notAttending: 63, prepared: 0, served: 0 },
  };

  return MEAL_DEFINITIONS.map((meal) => {
    let status = 'upcoming';
    if (nowMin >= meal.endMin) status = 'completed';
    else if (nowMin >= meal.startMin) status = 'serving';

    return {
      id: meal.id,
      name: meal.name,
      date: dateKey,
      time: meal.window,
      cutoffLabel: meal.cutoffLabel,
      menu: menu[meal.id],
      status,
      ...profile[meal.id],
      noResponse:
        messTotals.registeredStudents - profile[meal.id].attending - profile[meal.id].notAttending,
    };
  });
}

// Placeholder outputs shaped like the future Python model's response.
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
  users,
  MEAL_DEFINITIONS,
  WEEKLY_MENU,
  messTotals,
  predictions,
  wasteTrend,
  attendanceLog,
  toDateKey,
  addDays,
  getMealsForDate,
  setMealIntent,
  getHistory,
  summariseHistory,
  historyTrend,
  getNotifications,
  markNotification,
  getPreferences,
  setPreferences,
  adminMealSnapshot,
};
