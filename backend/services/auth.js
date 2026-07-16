// ─────────────────────────────────────────────
//  services/auth.js — JWT + bcrypt user auth
//  In-memory user store (no DB needed)
// ─────────────────────────────────────────────
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const JWT_SECRET  = process.env.JWT_SECRET || "datalens_secret_key_change_in_prod";
const JWT_EXPIRES = "7d";

// In-memory user store: { id, name, email, passwordHash, createdAt, avatar }
const users = new Map();

// ── Register ──────────────────────────────────
async function register(name, email, password) {
  const existing = [...users.values()].find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) throw new Error("Email already registered.");
  if (!name?.trim())     throw new Error("Name is required.");
  if (!email?.includes("@")) throw new Error("Invalid email address.");
  if (password?.length < 6)  throw new Error("Password must be at least 6 characters.");

  const id           = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const avatar       = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=7c6aff`;

  const user = { id, name: name.trim(), email: email.toLowerCase(), passwordHash, createdAt: new Date().toISOString(), avatar };
  users.set(id, user);

  const token = jwt.sign({ userId: id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { token, user: safeUser(user) };
}

// ── Login ─────────────────────────────────────
async function login(email, password) {
  const user = [...users.values()].find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("No account found with this email.");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Incorrect password.");

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { token, user: safeUser(user) };
}

// ── Verify token ──────────────────────────────
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = users.get(decoded.userId);
    if (!user) throw new Error("User not found.");
    return safeUser(user);
  } catch (err) {
    throw new Error("Invalid or expired token.");
  }
}

function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { register, login, verifyToken };