// ─────────────────────────────────────────────
//  services/database.js
//  File-based SQLite persistence — survives server restarts
// ─────────────────────────────────────────────
const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Directory to store session DB files + metadata
const SESSION_DIR = path.join(os.tmpdir(), "datamind_sessions");
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

// In-memory cache: sessionId → { db, tableName, schema, originalFilename }
const cache = new Map();
let SQL = null;

async function getSql() {
  if (!SQL) SQL = await initSqlJs();
  return SQL;
}

// ── File paths for a session ──────────────────
function dbFilePath(sessionId)   { return path.join(SESSION_DIR, `${sessionId}.db`);   }
function metaFilePath(sessionId) { return path.join(SESSION_DIR, `${sessionId}.meta.json`); }

// ── Load a session from disk into cache ───────
async function loadSessionFromDisk(sessionId) {
  const dbPath   = dbFilePath(sessionId);
  const metaPath = metaFilePath(sessionId);

  if (!fs.existsSync(dbPath) || !fs.existsSync(metaPath)) return null;

  try {
    const SqlJs   = await getSql();
    const fileBuffer = fs.readFileSync(dbPath);
    const db      = new SqlJs.Database(fileBuffer);
    const meta    = JSON.parse(fs.readFileSync(metaPath, "utf8"));

    cache.set(sessionId, { db, ...meta });
    console.log(`[DB] Loaded session ${sessionId} from disk`);
    return cache.get(sessionId);
  } catch (err) {
    console.error(`[DB] Failed to load session ${sessionId} from disk:`, err.message);
    return null;
  }
}

// ── Save current DB state to disk ─────────────
function saveSessionToDisk(sessionId) {
  const session = cache.get(sessionId);
  if (!session) return;

  try {
    // Export db to Uint8Array and write to file
    const data = session.db.export();
    fs.writeFileSync(dbFilePath(sessionId), Buffer.from(data));

    // Write metadata (schema, tableName, filename)
    const meta = {
      tableName:        session.tableName,
      schema:           session.schema,
      originalFilename: session.originalFilename,
    };
    fs.writeFileSync(metaFilePath(sessionId), JSON.stringify(meta, null, 2));
  } catch (err) {
    console.error(`[DB] Failed to save session ${sessionId} to disk:`, err.message);
  }
}

// ── Create a new session ──────────────────────
async function createSession(sessionId, tableName, columns, rows, originalFilename) {
  const SqlJs = await getSql();

  // Close existing in-memory db if any
  if (cache.has(sessionId)) {
    try { cache.get(sessionId).db.close(); } catch (_) {}
    cache.delete(sessionId);
  }

  const db = new SqlJs.Database();

  // Infer column types
  const colDefs = columns.map((col) => {
    const samples = rows.slice(0, 30).map((r) => r[col]).filter(Boolean);
    return { name: col, type: inferSQLType(samples) };
  });

  const safeCols = colDefs
    .map(({ name, type }) => `"${sanitizeColName(name)}" ${type}`)
    .join(", ");

  db.run(`CREATE TABLE IF NOT EXISTS "${tableName}" (${safeCols})`);

  // Bulk insert
  const placeholders = columns.map(() => "?").join(", ");
  const stmt = db.prepare(`INSERT INTO "${tableName}" VALUES (${placeholders})`);
  for (const row of rows) {
    const vals = columns.map((c) =>
      coerceValue(row[c], colDefs.find((d) => d.name === c)?.type)
    );
    stmt.run(vals);
  }
  stmt.free();

  const schema = {
    tableName,
    columns: colDefs,
    rowCount: rows.length,
    sampleRows: rows.slice(0, 3),
  };

  cache.set(sessionId, { db, tableName, schema, originalFilename });

  // Persist to disk immediately
  saveSessionToDisk(sessionId);
  console.log(`[DB] Created + saved session ${sessionId} (${rows.length} rows)`);

  return schema;
}

// ── Execute a query ───────────────────────────
async function executeQuery(sessionId, sql) {
  // Try cache first, then disk
  let session = cache.get(sessionId);
  if (!session) {
    session = await loadSessionFromDisk(sessionId);
  }
  if (!session) {
    throw new Error("Session not found. Please re-upload your CSV file.");
  }

  // Safety: only SELECT
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are permitted.");
  }
  const dangerous = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|PRAGMA|ATTACH)\b/i;
  if (dangerous.test(sql)) {
    throw new Error("Query contains disallowed SQL statements.");
  }

  try {
    const results = session.db.exec(sql);
    if (!results || results.length === 0) return { rows: [], columns: [] };

    const { columns, values } = results[0];
    const rows = values.map((val) => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = val[i]; });
      return obj;
    });
    return { rows, columns };
  } catch (err) {
    throw new Error(`SQL execution error: ${err.message}`);
  }
}

// ── Get session (loads from disk if needed) ───
async function getSession(sessionId) {
  if (cache.has(sessionId)) return cache.get(sessionId);
  return await loadSessionFromDisk(sessionId);
}

// ── Delete session ────────────────────────────
function deleteSession(sessionId) {
  if (cache.has(sessionId)) {
    try { cache.get(sessionId).db.close(); } catch (_) {}
    cache.delete(sessionId);
  }
  // Remove files from disk
  [dbFilePath(sessionId), metaFilePath(sessionId)].forEach(f => {
    if (fs.existsSync(f)) { try { fs.unlinkSync(f); } catch (_) {} }
  });
}

// ── Cleanup old sessions (older than 24h) ─────
function cleanupOldSessions() {
  try {
    const files = fs.readdirSync(SESSION_DIR);
    const now = Date.now();
    const seen = new Set();

    files.forEach(file => {
      const sessionId = file.replace(/\.(db|meta\.json)$/, "");
      if (seen.has(sessionId)) return;
      seen.add(sessionId);

      const filePath = path.join(SESSION_DIR, file);
      const stat = fs.statSync(filePath);
      const ageHours = (now - stat.mtimeMs) / 1000 / 60 / 60;

      if (ageHours > 24) {
        deleteSession(sessionId);
        console.log(`[DB] Cleaned up old session: ${sessionId}`);
      }
    });
  } catch (err) {
    console.error("[DB] Cleanup error:", err.message);
  }
}

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

// ── Helpers ───────────────────────────────────
function inferSQLType(samples) {
  if (!samples.length) return "TEXT";
  const allNumeric = samples.every((v) => !isNaN(parseFloat(v)) && isFinite(v));
  if (allNumeric) {
    const allInt = samples.every((v) => Number.isInteger(parseFloat(v)));
    return allInt ? "INTEGER" : "REAL";
  }
  const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;
  if (samples.every((v) => datePattern.test(String(v).trim()))) return "TEXT";
  return "TEXT";
}

function coerceValue(val, type) {
  if (val === null || val === undefined || val === "") return null;
  if (type === "INTEGER") return parseInt(val, 10) || null;
  if (type === "REAL")    return parseFloat(val)   || null;
  return String(val);
}

function sanitizeColName(name) {
  return name.replace(/[^\w\s]/g, "").trim().replace(/\s+/g, "_");
}

module.exports = { createSession, executeQuery, getSession, deleteSession };