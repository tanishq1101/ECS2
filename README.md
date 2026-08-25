# Smart Food Wastage Analyser

A prototype system that reduces college mess food wastage by collecting **student meal
intentions** before each meal, recording **actual attendance** at the mess, and giving the
kitchen a headcount to prepare against.

The project has two halves that share one backend, one authentication system and one design
system:

```
Smart Food Wastage Analyser
        │
        ├── Student Portal        /student/*     (plan meals, view history)
        │
        └── Mess Staff Dashboard  /admin/*       (responses, attendance, analytics)
```

---

## What is real, and what is not

**Persisted in SQLite** (`backend/db/schema.sql`): accounts, meal intentions, attendance rows,
notification read state, student preferences and login sessions. A student's response survives
a server restart, and so does their session.

Still **not** connected:

* ESP32 + fingerprint sensor hardware — attendance rows are seeded demo records
* a trained ML model — the staff prediction page shows clearly-labelled placeholders
* mess-wide staff aggregates (486 students, waste totals) — placeholder figures, since the two
  demo accounts obviously cannot produce them

The UI says so wherever it matters, so no screen claims a fingerprint was scanned or a model
was run when neither happened.

---

## Getting started

### Prerequisites

* [Node.js](https://nodejs.org/) 18 or later (includes `npm`)
* [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/tanishq1101/ECS2.git
cd ECS2
```

### 2. Start the backend (Terminal 1)

```bash
cd backend
npm install
npm start
```

The API runs at **http://localhost:5001**. On first start it creates
`backend/data/smartmess.db`, applies the schema and seeds three weeks of demo history — there is
no separate migration step. The file is gitignored; `npm run db:reset` rebuilds it from scratch,
and `DB_PATH` points the server at a different file.

### 3. Start the frontend (Terminal 2)

Open a second terminal in the project root:

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173** — open that URL in your browser.

Vite proxies `/api` to port 5001, so no environment variables are needed for local work. To
point the frontend at a different API host, set `VITE_API_URL`.

### 4. Log in

Use one of the [demo accounts](#demo-accounts) below to sign in as a student or as mess staff.

### Demo accounts

| Role | Email (or student ID) | Password |
| --- | --- | --- |
| Student | `student.demo@smartmess.demo` or `24BCE1187` | `Student@123` |
| Mess staff | `mess.admin@smartmess.demo` | `Mess@123` |

Staff credentials are never shown inside the student portal. The role returned by the login
endpoint decides which portal a session lands in.

---

## Project structure

```
backend/
  server.js          Express app, CORS, health check, reserved hardware endpoint
  auth.js            Token issue/verify, requireAuth + requireRole guards
  password.js        scrypt hashing (node crypto — no dependency)
  store.js           Every accessor the routes call; the only place SQL is written
  db/
    schema.sql       Tables, constraints and indexes
    index.js         Connection; applies the schema on every boot
    seed.js          Reference data + an idempotent demo-history top-up
  data/              The SQLite file lives here (gitignored)
  routes/api.js      Every endpoint, grouped by role
  scripts/
    smoke-test.js    End-to-end API test, including a restart  (npm test)
    reset-db.js      Delete and rebuild the database           (npm run db:reset)

frontend/src/
  App.jsx                     Routes for both portals
  index.css                   Design tokens + shared primitives
  styles/                     student.css · admin.css · login.css
  context/                    AuthContext (shared) · ToastContext
  services/api.js             The only place fetch is called
  hooks/                      useApi (loading/error/empty) · useMeals (intent saving)
  components/
    ProtectedRoute.jsx        Role-aware route guard
    common/                   StateBlocks · StatCard
    student/                  StudentLayout · Sidebar · Header · BottomNav
                              MealCard · MealIntentSelector · StatusBadges
                              NotificationCard · navItems
    admin/AdminLayout.jsx
  pages/
    LoginStudent.jsx · LoginAdmin.jsx · NotFound.jsx
    student/                  Dashboard · Meals · History · Notifications · Profile
    admin/                    Dashboard · Predictions · Attendance · Analytics
```

---

## API

Shared:

```
POST   /api/auth/login          → { token, user: { role, … } }
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/profile
GET    /api/health              → { database: 'connected', mlService, fingerprintHardware, … }
```

Student (role: `student`):

```
GET    /api/student/meals                     today + tomorrow, with own intent/attendance
POST   /api/student/meals/:mealId/intent      { intent, date } — the portal's only write
GET    /api/student/history?days=14           records + summary + daily trend
GET    /api/student/notifications
POST   /api/student/notifications/:id/read    :id may be "all"
GET    /api/student/profile
PATCH  /api/student/preferences
```

Mess staff (role: `admin`):

```
GET    /api/dashboard/summary
GET    /api/meals/today
GET    /api/predictions
GET    /api/attendance
GET    /api/analytics
```

Requests without a valid token get `401`; requests from the wrong role get `403`. A student
session cannot read any mess-wide totals, predictions or preparation quantities.

---

## Database

SQLite, via `better-sqlite3`. One file at `backend/data/smartmess.db`, created and migrated on
first boot — `db/schema.sql` is entirely `CREATE ... IF NOT EXISTS`, so applying it on every
start is both the first-run setup and a no-op afterwards.

| Table | Holds |
| --- | --- |
| `users` | Accounts for both roles. Passwords are scrypt hashes, never plain text. |
| `sessions` | Bearer tokens, so restarting the API no longer signs everyone out. |
| `meals` · `menu_items` | Meal windows, cutoffs and the weekly menu rotation. |
| `meal_intents` | What the student said. PK `(student_id, meal_date, meal_id)`. |
| `attendance` | What was recorded at the entrance. Same PK, separate table — see below. |
| `notifications` · `notification_reads` | Shared bodies, per-student read state. |
| `preferences` | One row per student. |

Seeding runs on every boot and is idempotent. `seedReferenceData()` inserts accounts, meals and
menus once; `seedDemoHistory()` tops up ~3 weeks of intent/attendance rows with
`INSERT OR IGNORE`, so a database seeded last week gains only the days it is missing and a row a
real student wrote is never overwritten.

### Testing

```bash
cd backend
npm test
```

Boots the real server against a throwaway database, drives it over HTTP the way the frontend
does — auth, role separation, cutoffs, intents, notifications, preferences, history — then
restarts it and re-checks that the session, the saved intent, the read state and the preferences
all survived.

---

## Two concepts that are never merged

| | Meal intention | Actual attendance |
| --- | --- | --- |
| Set by | The student, in the portal | The mess entrance |
| Field | `studentIntent` | `attendanceStatus` |
| Values | `attending` · `not_attending` · `none` | `verified` · `not_verified` · `none` |
| Editable | Until the meal's cutoff | Never, from the portal |

They are shown in separate sections on every meal card, with separate badges, so a student can
always tell what they said apart from what was recorded.

Cutoffs: breakfast 6:30 AM, lunch 10:30 AM, dinner 5:30 PM. After the cutoff the card locks and
explains why. Tomorrow's meals are always open, so there is always something to respond to.

---

## Wiring up the real system later

**Database — done.** Every read and write goes through an accessor in `store.js`
(`getMealsForDate`, `setMealIntent`, `getHistory`, …), which is the only module in the backend
that writes SQL. The in-memory `Map`s those accessors used to hold were keyed
`studentId | date | mealId`; that is now the composite primary key of `meal_intents` and
`attendance`. Because better-sqlite3's API is synchronous, every signature stayed the same and
no route handler or frontend file had to change.

Moving to Postgres or MySQL later means rewriting the query bodies in `store.js` and making the
accessors `async` — at which point the route handlers need `await`, but nothing else moves.

**Fingerprint hardware.** `POST /api/hardware/attendance` is reserved in `server.js` and
currently returns `501`. When the ESP32 posts `{ studentId, mealId, scannedAt, deviceId }`, it
writes an attendance row with `source: 'fingerprint'`. The `attendance` table already has the
`source` and `device_id` columns waiting, and the student UI already renders that case as
"Verified by fingerprint" instead of the demo wording — no frontend change needed.

**ML model.** Student intentions are exactly the training signal the model needs, now genuinely
stored per student, per meal, per day, alongside the attendance that followed —
`idx_intents_date_meal` and `idx_attendance_date_meal` exist for exactly that aggregate query.
The staff predictions endpoint returns `modelStatus: 'not_connected'` today; pointing it at a
Python service is a change inside one route handler.

```
Student meal intentions → database → ML model → expected attendance → staff dashboard
Fingerprint sensor → ESP32 → backend → attendance record → student + staff dashboards
```

---

## Accessibility and responsiveness

* Sidebar on desktop, bottom navigation on mobile (below 860px); tested at 375px with no
  horizontal scrolling
* The history table becomes cards on small screens rather than scrolling sideways
* Status is never carried by colour alone — every badge has an icon and a word
* Semantic landmarks, one `h1` per page, skip link, visible focus rings, labelled form fields,
  44px minimum touch targets, and `prefers-reduced-motion` support
