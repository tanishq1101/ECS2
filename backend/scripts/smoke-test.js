/**
 * End-to-end smoke test.
 *
 * Boots the real server against a throwaway database, drives it over HTTP the
 * way the frontend does, then restarts it to prove the writes actually landed
 * on disk rather than in a process-local Map.
 *
 *   npm test
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.SMOKE_PORT || 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'smartmess-')), 'test.db');

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbFile },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in time')), 15000);
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('http://localhost')) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on('exit', (code) => reject(new Error(`server exited early (${code})`)));
  });
}

function stopServer(child) {
  return new Promise((resolve) => {
    child.removeAllListeners('exit');
    child.on('exit', resolve);
    child.kill('SIGTERM');
  });
}

async function api(pathname, { token, method = 'GET', body } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

/** The next date whose intent cutoff has definitely not passed. */
function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function run() {
  let server = await startServer();

  console.log('\nhealth');
  const health = await api('/api/health');
  check('reports the database as connected', health.json?.database === 'connected', JSON.stringify(health.json));

  console.log('\nauth');
  check('rejects an anonymous request', (await api('/api/student/meals')).status === 401);
  check('rejects a wrong password',
    (await api('/api/auth/login', { method: 'POST', body: { email: 'student.demo@smartmess.demo', password: 'wrong' } })).status === 401);

  const byEmail = await api('/api/auth/login', { method: 'POST', body: { email: 'student.demo@smartmess.demo', password: 'Student@123' } });
  check('logs a student in by email', byEmail.status === 200 && byEmail.json?.user?.role === 'student');
  check('never returns a password or hash',
    !JSON.stringify(byEmail.json).match(/password/i), JSON.stringify(byEmail.json?.user));

  const byStudentId = await api('/api/auth/login', { method: 'POST', body: { email: '24BCE1187', password: 'Student@123' } });
  check('logs the same student in by student ID', byStudentId.json?.user?.id === byEmail.json?.user?.id);

  const student = byEmail.json.token;

  const admin = (await api('/api/auth/login', { method: 'POST', body: { email: 'mess.admin@smartmess.demo', password: 'Mess@123' } })).json;
  check('logs mess staff in', admin?.user?.role === 'admin');

  console.log('\nrole separation');
  check('student cannot read the staff dashboard', (await api('/api/dashboard/summary', { token: student })).status === 403);
  check('staff cannot read student meals', (await api('/api/student/meals', { token: admin.token })).status === 403);

  console.log('\nmeals');
  const meals = await api('/api/student/meals', { token: student });
  check('returns today and tomorrow', meals.json?.today?.meals?.length === 3 && meals.json?.tomorrow?.meals?.length === 3);
  check('every meal carries a menu', meals.json.today.meals.every((m) => m.menu.length > 0));
  check('intent and attendance are separate fields',
    meals.json.today.meals.every((m) => 'studentIntent' in m && 'attendanceStatus' in m));

  console.log('\nintents');
  const date = tomorrowKey();
  const saved = await api('/api/student/meals/lunch/intent', { token: student, method: 'POST', body: { intent: 'not_attending', date } });
  check('saves an intent before the cutoff', saved.status === 200 && saved.json?.meal?.studentIntent === 'not_attending');
  check('rejects an invalid intent',
    (await api('/api/student/meals/lunch/intent', { token: student, method: 'POST', body: { intent: 'maybe', date } })).status === 400);
  check('404s an unknown meal',
    (await api('/api/student/meals/brunch/intent', { token: student, method: 'POST', body: { intent: 'attending', date } })).status === 404);
  check('409s a passed cutoff',
    (await api('/api/student/meals/lunch/intent', { token: student, method: 'POST', body: { intent: 'attending', date: '2024-01-01' } })).status === 409);

  console.log('\nnotifications + preferences');
  const marked = await api('/api/student/notifications/n-1/read', { token: student, method: 'POST', body: { read: true } });
  check('marks one notification read', marked.json?.notifications?.find((n) => n.id === 'n-1')?.read === true);
  const cleared = await api('/api/student/notifications/all/read', { token: student, method: 'POST', body: { read: true } });
  check('marks the whole list read', cleared.json?.unreadCount === 0);
  const prefs = await api('/api/student/preferences', { token: student, method: 'PATCH', body: { menuUpdates: true, bogus: 'x' } });
  check('saves a preference and ignores unknown keys',
    prefs.json?.preferences?.menuUpdates === true && !('bogus' in prefs.json.preferences));

  console.log('\nhistory');
  const history = await api('/api/student/history?days=14', { token: student });
  check('returns seeded history rows', history.json?.records?.length > 0, `${history.json?.records?.length} rows`);
  check('history excludes today', !history.json.records.some((r) => r.date === new Date().toISOString().slice(0, 10)));
  check('summary counts add up', history.json.summary.totalRecords === history.json.records.length);
  check('trend is oldest-first',
    history.json.trend.every((p, i, arr) => i === 0 || arr[i - 1].date < p.date));

  // ---- restart: the real point of this phase ----
  console.log('\npersistence across a restart');
  await stopServer(server);
  server = await startServer();

  const afterRestart = await api('/api/student/meals', { token: student });
  check('the session still works', afterRestart.status === 200);

  const tomorrowLunch = afterRestart.json?.tomorrow?.meals?.find((m) => m.id === 'lunch');
  check('the saved intent survived', tomorrowLunch?.studentIntent === 'not_attending', JSON.stringify(tomorrowLunch?.studentIntent));

  const notesAfter = await api('/api/student/notifications', { token: student });
  check('read state survived', notesAfter.json?.unreadCount === 0);

  const prefsAfter = await api('/api/student/profile', { token: student });
  check('preferences survived', prefsAfter.json?.preferences?.menuUpdates === true);

  const otherStudent = (await api('/api/auth/login', { method: 'POST', body: { email: 'aarav.menon@smartmess.demo', password: 'Student@123' } })).json;
  const otherNotes = await api('/api/student/notifications', { token: otherStudent.token });
  check('one student clearing notifications does not clear another\'s', otherNotes.json?.unreadCount > 0);

  console.log('\nlogout');
  await api('/api/auth/logout', { token: student, method: 'POST' });
  check('the token stops working after logout', (await api('/api/student/meals', { token: student })).status === 401);

  await stopServer(server);
}

run()
  .then(() => {
    console.log(`\n${passed} passed, ${failures.length} failed`);
    if (failures.length) {
      failures.forEach((f) => console.log(`  - ${f}`));
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('\nsmoke test crashed:', err.message);
    process.exit(1);
  })
  .finally(() => {
    fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
  });
