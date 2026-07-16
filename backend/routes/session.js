// ─────────────────────────────────────────────
//  routes/session.js
//  GET  /api/session/:id  — check session status
//  DELETE /api/session/:id — clear session
// ─────────────────────────────────────────────
const express = require("express");
const { getSession, deleteSession } = require("../services/database");

const router = express.Router();

router.get("/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ exists: false });
  }
  res.json({
    exists: true,
    tableName: session.tableName,
    filename: session.originalFilename,
    schema: session.schema,
  });
});

router.delete("/:sessionId", (req, res) => {
  deleteSession(req.params.sessionId);
  res.json({ success: true, message: "Session cleared." });
});

module.exports = router;
