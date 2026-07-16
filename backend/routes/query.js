// routes/query.js
const express = require("express");
const { getSession, executeQuery } = require("../services/database");
const { generateDashboard, validateLLMOutput } = require("../services/llm");

const router = express.Router();
const conversationHistories = new Map();

router.post("/", async (req, res) => {
  const { query, sessionId, uid } = req.body;
  if (!query || typeof query !== "string" || !query.trim())
    return res.status(400).json({ error: "Please provide a query." });
  if (!sessionId)
    return res.status(400).json({ error: "Session ID required. Please upload a CSV first." });

  const session = await getSession(sessionId);
  if (!session)
    return res.status(404).json({ error: "Session not found. Please re-upload your CSV file." });

  const history = conversationHistories.get(sessionId) || [];

  try {
    const llmResult  = await generateDashboard(query.trim(), session.schema, history, session.db);
    const validation = validateLLMOutput(llmResult, session.schema);

    if (!validation.valid)
      return res.json({ success: false, error: validation.reason, query });

    // ── Chat response (greeting / meta / small talk) ──
    if (llmResult.type === 'chat') {
      updateHistory(sessionId, history, query, llmResult.message);
      return res.json({
        success: true,
        type: 'chat',
        message: llmResult.message,
        query,
      });
    }

    // ── Clarification needed ──
    if (llmResult.type === 'clarify' || llmResult.needsClarification) {
      return res.json({
        success: true,
        needsClarification: true,
        question: llmResult.question,
        options:  llmResult.options || [],
        query,
      });
    }

    // ── Cannot answer data query ──
    if (!validation.canAnswer || llmResult.canAnswer === false) {
      updateHistory(sessionId, history, query, `[Cannot answer] ${llmResult.reason}`);
      return res.json({
        success: false, canAnswer: false,
        reason:      llmResult.reason || "This question cannot be answered with the available data.",
        hint:        llmResult.hint || null,
        suggestions: llmResult.suggestions || [],
        query,
      });
    }

    // ── Execute SQL ──
    let queryResult;
    try {
      queryResult = await executeQuery(sessionId, llmResult.sql);
    } catch (sqlErr) {
      console.warn("[QUERY] SQL exec failed:", sqlErr.message);
      try {
        const fallbackSql   = `SELECT * FROM "${session.schema.tableName}" LIMIT 20`;
        queryResult         = await executeQuery(sessionId, fallbackSql);
        llmResult.sql       = fallbackSql;
        llmResult.chartType = "table";
        llmResult._source   = "sql_error_fallback";
        llmResult.insight   = `Note: Query had an issue. Showing raw data instead.`;
      } catch {
        return res.json({ success: false, error: `Query failed: ${sqlErr.message}`, query });
      }
    }

    const processedData    = postProcess(queryResult.rows, llmResult.chartConfig);
    const assistantSummary = `Generated ${llmResult.chartType} chart: "${llmResult.chartConfig?.title}"`;
    updateHistory(sessionId, history, query, assistantSummary);

    // Save to Firestore
    if (uid) {
      try {
        const admin   = require("../services/firebaseAdmin");
        const dbFs    = admin.firestore();
        const userRef = dbFs.collection("users").doc(uid);
        await userRef.collection("queries").add({
          query, chartType: llmResult.chartType,
          chartTitle: llmResult.chartConfig?.title || "",
          rowCount: queryResult.rows.length, sql: llmResult.sql,
          timestamp: admin.firestore.FieldValue.serverTimestamp(), sessionId,
        });
        await userRef.set({
          totalQueries: admin.firestore.FieldValue.increment(1),
          totalCharts:  admin.firestore.FieldValue.increment(1),
          lastActive:   admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (fsErr) {
        console.warn("[Firestore] Failed to save query:", fsErr.message);
      }
    }

    res.json({
      success: true, query, type: 'data',
      sql: llmResult.sql, sqlExplanation: llmResult.sqlExplanation,
      chartType: llmResult.chartType, chartConfig: llmResult.chartConfig,
      data: processedData, rawRows: queryResult.rows, columns: queryResult.columns,
      insight: llmResult.insight, rowCount: queryResult.rows.length,
      source: llmResult._source || "gemini", timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[QUERY ERROR]", err);
    res.status(500).json({ success: false, error: "Unexpected error. Please try again." });
  }
});

router.get("/schema/:sessionId", async (req, res) => {
  const session = await getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });
  res.json({ schema: session.schema, filename: session.originalFilename });
});

function updateHistory(sessionId, history, userMsg, assistantMsg) {
  history.push({ role: "user", content: userMsg });
  history.push({ role: "assistant", content: assistantMsg });
  conversationHistories.set(sessionId, history.slice(-20));
}

function postProcess(rows, chartConfig) {
  if (!rows || rows.length === 0) return [];
  const yKey = chartConfig?.yKey;
  return rows.map(row => {
    const p = { ...row };
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === "string" && v !== "" && !isNaN(parseFloat(v)) && isFinite(v))
        p[k] = parseFloat(parseFloat(v).toFixed(2));
    }
    if (yKey && p[yKey] !== null && p[yKey] !== undefined) {
      const n = parseFloat(p[yKey]);
      if (!isNaN(n)) p[yKey] = parseFloat(n.toFixed(2));
    }
    return p;
  });
}

module.exports = router;