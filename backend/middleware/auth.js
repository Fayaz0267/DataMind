// middleware/auth.js — Firebase token verification
const admin = require('../services/firebaseAdmin');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const token   = header.slice(7);
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth };