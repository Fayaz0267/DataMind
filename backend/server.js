require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

const uploadRoutes  = require("./routes/upload");
const queryRoutes   = require("./routes/query");
const sessionRoutes = require("./routes/session");
const authRoutes    = require("./routes/auth");

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(rateLimit({ windowMs: 60000, max: 60, message: { error: "Too many requests." } }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth",    authRoutes);
app.use("/api/upload",  uploadRoutes);
app.use("/api/query",   queryRoutes);
app.use("/api/session", sessionRoutes);

app.get("/api/health", (_req, res) => res.json({
  status: "ok",
  gemini: !!process.env.GEMINI_API_KEY,
  timestamp: new Date().toISOString()
}));

app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 DataLens AI backend  →  http://localhost:${PORT}`);
  console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? "✅" : "❌ missing GEMINI_API_KEY"}\n`);
});