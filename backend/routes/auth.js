// ─────────────────────────────────────────────
//  routes/auth.js
//  POST /api/auth/register
//  POST /api/auth/login
//  GET  /api/auth/me
// ─────────────────────────────────────────────
const express      = require("express");
const { register, login, verifyToken } = require("../services/auth");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
    const result = await register(name, email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;