/**
 * Deletes the database file and rebuilds it from schema + seed.
 *
 *   npm run db:reset
 *
 * Use it when the demo history has drifted, or after changing db/schema.sql —
 * the schema is applied with CREATE ... IF NOT EXISTS, so an existing table is
 * never altered in place.
 */

const fs = require('fs');
const path = require('path');

const target = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'smartmess.db');

if (target === ':memory:') {
  console.error('DB_PATH is :memory: — there is nothing to reset.');
  process.exit(1);
}

// WAL leaves two sidecar files next to the database.
['', '-wal', '-shm'].forEach((suffix) => {
  const file = target + suffix;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`removed ${path.basename(file)}`);
  }
});

// Requiring the store applies the schema and runs both seeders.
require('../store');
console.log(`rebuilt ${target}`);
