/**
 * Authentication.
 *
 * Passwords are stored as scrypt hashes in the users table and sessions live in
 * the sessions table, so restarting the API no longer signs everyone out.
 *
 * The route contract is unchanged: a Bearer token in the Authorization header,
 * the user (never the hash) attached to req.user.
 */

const crypto = require('crypto');
const store = require('./store');
const { verifyPassword } = require('./password');

/** Accepts an email address or a student ID. Returns null on any failure. */
function login(identifier, password) {
  const found = store.findUserForLogin(identifier);
  if (!found || !verifyPassword(password, found.passwordHash)) return null;

  const token = crypto.randomBytes(24).toString('hex');
  store.createSession(token, found.user.id);
  return { token, user: found.user };
}

function logout(token) {
  return store.deleteSession(token);
}

function userForToken(token) {
  return store.userForSession(token);
}

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Rejects anonymous requests. Attaches req.user + req.token on success. */
function requireAuth(req, res, next) {
  const token = readToken(req);
  const user = token && userForToken(token);
  if (!user) {
    return res.status(401).json({ error: 'unauthorized', message: 'Please sign in to continue.' });
  }
  req.user = user;
  req.token = token;
  return next();
}

/** Role guard. Keeps admin aggregates out of student sessions and vice versa. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: 'forbidden', message: 'This account cannot access that area.' });
    }
    return next();
  };
}

module.exports = { login, logout, userForToken, requireAuth, requireRole };
