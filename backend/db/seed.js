/**
 * Seeding.
 *
 * Two jobs, both idempotent so they can run on every boot:
 *
 *   seedReferenceData()  accounts, meal definitions, the weekly menu and the
 *                        notification list — inserted once, then left alone.
 *
 *   seedDemoHistory()    tops up ~3 weeks of intent/attendance rows so the
 *                        dashboard is never empty. Uses INSERT OR IGNORE, so a
 *                        row a real student wrote is never overwritten, and a
 *                        database seeded last week gains only the missing days.
 *
 * When the mess runs for real, drop the seedDemoHistory() call in store.js and
 * the tables fill from the portal and the entrance reader instead.
 */

const { db } = require('./index');
const { hashPassword } = require('../password');

/* ------------------------------------------------------------------ *
 * Reference data
 * ------------------------------------------------------------------ */

// Demo accounts. Passwords are hashed on the way in, never stored as typed.
const USERS = [
  {
    id: 'staff-01', role: 'admin', name: 'Ramesh Kulkarni',
    email: 'mess.admin@smartmess.demo', password: 'Mess@123',
    designation: 'Mess Supervisor', mess: 'Central Mess — Block A',
  },
  {
    id: 'stu-2024-1187', role: 'student', name: 'Ved Kamath',
    email: 'student.demo@smartmess.demo', password: 'Student@123',
    studentId: '24BCE1187', hostel: 'Nilgiri Hostel', room: 'B-214',
    program: 'B.Tech Computer Science', year: '2nd Year',
    messPlan: 'Full Plan (3 meals)', joinedOn: '2024-07-22',
  },
  {
    id: 'stu-2024-1042', role: 'student', name: 'Aarav Menon',
    email: 'aarav.menon@smartmess.demo', password: 'Student@123',
    studentId: '24BCE1042', hostel: 'Nilgiri Hostel', room: 'A-108',
    program: 'B.Tech Electronics', year: '2nd Year',
    messPlan: 'Full Plan (3 meals)', joinedOn: '2024-07-22',
  },
];

const MEALS = [
  { id: 'breakfast', name: 'Breakfast', timeWindow: '7:30 AM – 9:30 AM',
    startMin: 7 * 60 + 30, endMin: 9 * 60 + 30, cutoffMin: 6 * 60 + 30, cutoffLabel: '6:30 AM' },
  { id: 'lunch', name: 'Lunch', timeWindow: '12:30 PM – 2:00 PM',
    startMin: 12 * 60 + 30, endMin: 14 * 60, cutoffMin: 10 * 60 + 30, cutoffLabel: '10:30 AM' },
  { id: 'dinner', name: 'Dinner', timeWindow: '7:30 PM – 9:30 PM',
    startMin: 19 * 60 + 30, endMin: 21 * 60 + 30, cutoffMin: 17 * 60 + 30, cutoffLabel: '5:30 PM' },
];

// Indexed by JS day-of-week (0 = Sunday).
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

const NOTIFICATIONS = [
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

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users
    (id, role, name, email, password_hash, designation, mess,
     student_id, hostel, room, program, year, mess_plan, joined_on)
  VALUES
    (@id, @role, @name, @email, @passwordHash, @designation, @mess,
     @studentId, @hostel, @room, @program, @year, @messPlan, @joinedOn)
`);

const insertMeal = db.prepare(`
  INSERT OR IGNORE INTO meals
    (id, name, time_window, start_min, end_min, cutoff_min, cutoff_label, sort_order)
  VALUES
    (@id, @name, @timeWindow, @startMin, @endMin, @cutoffMin, @cutoffLabel, @sortOrder)
`);

const insertMenuItem = db.prepare(`
  INSERT OR IGNORE INTO menu_items (day_of_week, meal_id, position, item)
  VALUES (?, ?, ?, ?)
`);

const insertNotification = db.prepare(`
  INSERT OR IGNORE INTO notifications
    (id, type, title, body, minutes_ago, default_read, sort_order)
  VALUES (@id, @type, @title, @body, @minutesAgo, @defaultRead, @sortOrder)
`);

const seedReferenceData = db.transaction(() => {
  USERS.forEach((u) => {
    insertUser.run({
      id: u.id, role: u.role, name: u.name, email: u.email,
      passwordHash: hashPassword(u.password),
      designation: u.designation ?? null, mess: u.mess ?? null,
      studentId: u.studentId ?? null, hostel: u.hostel ?? null, room: u.room ?? null,
      program: u.program ?? null, year: u.year ?? null,
      messPlan: u.messPlan ?? null, joinedOn: u.joinedOn ?? null,
    });
  });

  MEALS.forEach((meal, index) => insertMeal.run({ ...meal, sortOrder: index }));

  Object.entries(WEEKLY_MENU).forEach(([day, mealsForDay]) => {
    Object.entries(mealsForDay).forEach(([mealId, items]) => {
      items.forEach((item, position) => insertMenuItem.run(Number(day), mealId, position, item));
    });
  });

  NOTIFICATIONS.forEach((n, index) => {
    insertNotification.run({
      id: n.id, type: n.type, title: n.title, body: n.body,
      minutesAgo: n.minutesAgo, defaultRead: n.read ? 1 : 0, sortOrder: index,
    });
  });
});

/* ------------------------------------------------------------------ *
 * Demo history
 * ------------------------------------------------------------------ */

// Deterministic pseudo-random, so the demo reads the same on every machine.
function seededPick(seed, options) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return options[h % options.length];
}

const insertIntent = db.prepare(`
  INSERT OR IGNORE INTO meal_intents (student_id, meal_date, meal_id, intent, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);

const insertAttendance = db.prepare(`
  INSERT OR IGNORE INTO attendance
    (student_id, meal_date, meal_id, status, source, verified_at, device_id)
  VALUES (?, ?, ?, ?, ?, ?, NULL)
`);

const listStudents = db.prepare("SELECT id FROM users WHERE role = 'student'");
const listMeals = db.prepare('SELECT * FROM meals ORDER BY sort_order');

/**
 * @param {object} helpers  date utilities from store.js, passed in to keep the
 *                          date maths defined in exactly one place
 */
const seedDemoHistory = db.transaction((helpers, days = 21) => {
  const { toDateKey, addDays, atMinutes, minutesNow } = helpers;
  const today = new Date();
  const todayKey = toDateKey(today);
  const nowMin = minutesNow(today);

  const students = listStudents.all();
  const meals = listMeals.all();

  students.forEach((student) => {
    for (let offset = days; offset >= 1; offset -= 1) {
      const dateKey = toDateKey(addDays(today, -offset));

      meals.forEach((meal) => {
        const seed = `${student.id}-${dateKey}-${meal.id}`;
        const intent = seededPick(seed, [
          'attending', 'attending', 'attending', 'attending',
          'not_attending', 'none', 'attending', 'attending',
        ]);

        insertIntent.run(
          student.id, dateKey, meal.id, intent,
          atMinutes(dateKey, meal.cutoff_min - 45).toISOString(),
        );

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

        insertAttendance.run(
          student.id, dateKey, meal.id, status,
          status === 'verified' ? 'demo' : null,
          status === 'verified' ? atMinutes(dateKey, meal.start_min + 20).toISOString() : null,
        );
      });
    }

    // Today: fill in only the meals whose cutoff/window has already passed, so
    // the student still has something live to respond to.
    meals.forEach((meal) => {
      if (nowMin > meal.cutoff_min) {
        insertIntent.run(
          student.id, todayKey, meal.id, 'attending',
          atMinutes(todayKey, meal.cutoff_min - 60).toISOString(),
        );
      }
      if (nowMin > meal.end_min) {
        insertAttendance.run(
          student.id, todayKey, meal.id, 'verified', 'demo',
          atMinutes(todayKey, meal.start_min + 15).toISOString(),
        );
      }
    });
  });
});

module.exports = { seedReferenceData, seedDemoHistory };
