-- Smart Food Wastage Analyser — SQLite schema.
--
-- Every statement is IF NOT EXISTS, so this file is applied on every boot and
-- is safe to re-run against an existing database.
--
-- Two facts are kept in two separate tables and are never merged:
--   meal_intents — what a student SAYS they will do (written from the portal)
--   attendance   — what was actually RECORDED at the mess entrance
-- Both are keyed (student_id, meal_date, meal_id): the composite primary key
-- the in-memory `${studentId}|${date}|${mealId}` map keys always implied.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  -- scrypt hash, never a plain-text password (see auth.js)
  password_hash TEXT NOT NULL,

  -- mess staff columns
  designation   TEXT,
  mess          TEXT,

  -- student columns
  student_id    TEXT UNIQUE,
  hostel        TEXT,
  room          TEXT,
  program       TEXT,
  year          TEXT,
  mess_plan     TEXT,
  joined_on     TEXT
);

-- Meal definitions. Times are minutes past midnight so the arithmetic stays
-- readable and free of timezone conversions.
CREATE TABLE IF NOT EXISTS meals (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  time_window  TEXT NOT NULL,
  start_min    INTEGER NOT NULL,
  end_min      INTEGER NOT NULL,
  cutoff_min   INTEGER NOT NULL,
  cutoff_label TEXT NOT NULL,
  sort_order   INTEGER NOT NULL
);

-- Weekly menu rotation. day_of_week matches JS getDay() (0 = Sunday).
CREATE TABLE IF NOT EXISTS menu_items (
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_id     TEXT NOT NULL REFERENCES meals(id),
  position    INTEGER NOT NULL,
  item        TEXT NOT NULL,
  PRIMARY KEY (day_of_week, meal_id, position)
);

-- What the student said. Editable until the meal's cutoff.
CREATE TABLE IF NOT EXISTS meal_intents (
  student_id TEXT NOT NULL REFERENCES users(id),
  meal_date  TEXT NOT NULL,                      -- YYYY-MM-DD
  meal_id    TEXT NOT NULL REFERENCES meals(id),
  intent     TEXT NOT NULL CHECK (intent IN ('attending', 'not_attending', 'none')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, meal_date, meal_id)
);

-- What was recorded at the entrance. Never written from the student portal.
-- `source` is 'demo' today and becomes 'fingerprint' once the ESP32 bridge
-- posts to /api/hardware/attendance; `device_id` is which reader saw them.
CREATE TABLE IF NOT EXISTS attendance (
  student_id  TEXT NOT NULL REFERENCES users(id),
  meal_date   TEXT NOT NULL,
  meal_id     TEXT NOT NULL REFERENCES meals(id),
  status      TEXT NOT NULL CHECK (status IN ('verified', 'not_verified', 'none')),
  source      TEXT,
  verified_at TEXT,
  device_id   TEXT,
  PRIMARY KEY (student_id, meal_date, meal_id)
);

-- Aggregate queries for the kitchen and for ML training read by date + meal.
CREATE INDEX IF NOT EXISTS idx_intents_date_meal    ON meal_intents (meal_date, meal_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date_meal ON attendance (meal_date, meal_id);

-- Notification bodies are shared; `minutes_ago` keeps demo timestamps fresh
-- relative to whenever the list is read.
CREATE TABLE IF NOT EXISTS notifications (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  minutes_ago  INTEGER NOT NULL,
  default_read INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL
);

-- Read/unread is per student, so one student clearing their list does not
-- clear anyone else's.
CREATE TABLE IF NOT EXISTS notification_reads (
  student_id      TEXT NOT NULL REFERENCES users(id),
  notification_id TEXT NOT NULL REFERENCES notifications(id),
  is_read         INTEGER NOT NULL,
  PRIMARY KEY (student_id, notification_id)
);

CREATE TABLE IF NOT EXISTS preferences (
  student_id            TEXT PRIMARY KEY REFERENCES users(id),
  notifications_enabled INTEGER NOT NULL,
  meal_reminders        INTEGER NOT NULL,
  cutoff_reminders      INTEGER NOT NULL,
  menu_updates          INTEGER NOT NULL
);

-- Sessions live here rather than in a process-local Map, so restarting the
-- API no longer signs everybody out.
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
