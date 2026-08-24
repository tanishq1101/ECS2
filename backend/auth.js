/**
 * Prototype authentication.
 *
 * DEMO MODE: passwords are compared in plain text and sessions live in memory.
 * The route contract (Bearer token in the Authorization header, role attached
 * to req.user) is the real one, so swapping this file for bcrypt + JWT later
 * does not change a single route handler or anything in the frontend.
 */

const crypto = require('crypto');
const { users } = require('./mockData');

const sessions = new Map(); // token -> userId

function publicUser(user) {
  // Never let the password leave this module.
  const { password, ...safe } = user;
  return safe;
}

function login(identifier, password) {
  const needle = String(identifier || '').trim().toLowerCase();
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === needle ||
      (u.studentId && u.studentId.toLowerCase() === needle)
  );

  if (!user || user.password !== password) return null;

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  return { token, user: publicUser(user) };
}

function logout(token) {
  return sessions.delete(token);
}

function userForToken(token) {
  const userId = sessions.get(token);
  if (!userId) return null;
  const user = users.find((u) => u.id === userId);
  return user ? publicUser(user) : null;
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

module.exports = { login, logout, userForToken, requireAuth, requireRole, publicUser };
