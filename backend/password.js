/**
 * Password hashing.
 *
 * Credentials now live in a database file rather than in a source file, so
 * they are stored as scrypt hashes instead of plain text. Uses node's built-in
 * crypto — no dependency needed.
 *
 * Format: scrypt$<salt-hex>$<derived-key-hex>
 */

const crypto = require('crypto');

const KEY_LENGTH = 64;

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/** Constant-time comparison, so a wrong password cannot be timed out digit by digit. */
function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, salt, expected] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;

  const actual = crypto.scryptSync(String(plain), salt, KEY_LENGTH);
  const expectedBuf = Buffer.from(expected, 'hex');
  if (expectedBuf.length !== actual.length) return false;
  return crypto.timingSafeEqual(actual, expectedBuf);
}

module.exports = { hashPassword, verifyPassword };
