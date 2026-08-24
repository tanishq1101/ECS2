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

## Demo / prototype mode

This build is deliberately a prototype. It does **not** have:

* a PostgreSQL/MySQL database — data lives in `backend/mockData.js`
* ESP32 + fingerprint sensor hardware — attendance records are demo data
* a trained ML model — the staff prediction page shows clearly-labelled placeholders

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

The API runs at **http://localhost:5001**.

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
  mockData.js        ALL prototype data and the accessors the routes call
  routes/api.js      Every endpoint, grouped by role

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
GET    /api/health
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

**Database.** Every read and write goes through an accessor in `mockData.js`
(`getMealsForDate`, `setMealIntent`, `getHistory`, …). The in-memory `Map`s are keyed
`studentId | date | mealId`, which maps directly onto a composite primary key. Replacing the
bodies of those functions with SQL queries requires no changes to the routes or the frontend.

**Fingerprint hardware.** `POST /api/hardware/attendance` is reserved in `server.js` and
currently returns `501`. When the ESP32 posts `{ studentId, mealId, scannedAt, deviceId }`, it
writes an attendance row with `source: 'fingerprint'`. The student UI already renders that case
as "Verified by fingerprint" instead of the demo wording — no frontend change needed.

**ML model.** Student intentions are exactly the training signal the model needs, already
stored per student, per meal, per day, alongside the attendance that followed. The staff
predictions endpoint returns `modelStatus: 'not_connected'` today; pointing it at a Python
service is a change inside one route handler.

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
