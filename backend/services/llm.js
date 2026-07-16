// ─────────────────────────────────────────────
//  services/llm.js — Smart chart selection v3
// ─────────────────────────────────────────────
const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

function initGemini() {
  if (!process.env.GEMINI_API_KEY) return false;
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    console.log("[LLM] Gemini initialised with gemini-2.0-flash-lite");
    return true;
  } catch (e) {
    console.warn("[LLM] Gemini init failed:", e.message);
    return false;
  }
}
initGemini();

// ─────────────────────────────────────────────
//  Smart Chart Selector
//  Decides chart type from query intent + data shape
// ─────────────────────────────────────────────
function selectChartType(query, cols, catCol, metricCol, groupCol) {
  const q = query.toLowerCase();

  // 1. Scatter — two numeric columns mentioned or "correlation/vs/versus"
  const numericCols = cols.filter(c => (c.type === "INTEGER" || c.type === "REAL") && !/^year$/i.test(c.name));
  const mentionedNumerics = numericCols.filter(c => q.includes(c.name.toLowerCase()));
  if (mentionedNumerics.length >= 2 ||
      /(correlation|vs\b|versus|scatter|relationship between|compare.*and.*\d)/i.test(q)) {
    return "scatter";
  }

  // 2. Line / Area — time series
  if (groupCol && (
      /(trend|over time|monthly|yearly|by month|by year|by date|last \d|growth over|history|timeline|forecast|progression)/i.test(q)
  )) {
    // Area for cumulative / growth / cumulative trends
    if (/(cumulative|running total|growth|accumulated|over time.*total|total.*over time)/i.test(q)) return "area";
    return "line";
  }

  // 3. Pie / Donut — proportions, parts of whole
  if (/(pie|donut|doughnut|share|proportion|percent|breakdown.*of|composition|parts of|portion|split by)/i.test(q)) {
    return "pie";
  }

  // 4. Bar — rankings, comparisons, categories
  if (/(top \d|best|worst|highest|lowest|ranking|most|least|compare|comparison|breakdown|bar chart|bar graph|by region|by category|by product|by segment|by rep|by department)/i.test(q)) {
    return "bar";
  }

  // 5. Table — raw data, list, show all
  if (/(table|list|all data|show all|raw|export|records|rows|details)/i.test(q)) {
    return "table";
  }

  // 6. Inferred from data shape — no explicit chart hint
  // Time col present + metric → line
  if (groupCol && metricCol) return "line";
  // Category col + metric → bar
  if (catCol && metricCol) return "bar";
  // Only numerics → scatter
  if (numericCols.length >= 2) return "scatter";
  // Fallback
  return "table";
}

// ─────────────────────────────────────────────
//  Ambiguity detector
// ─────────────────────────────────────────────
function detectAmbiguity(query, schema) {
  const q    = query.toLowerCase().trim();
  const cols = schema.columns;
  const numericCols = cols.filter(c => (c.type === "INTEGER" || c.type === "REAL") && !/^year$/i.test(c.name));
  const textCols    = cols.filter(c => c.type === "TEXT");
  const dateCol     = cols.find(c => /(date|month|year|time|period)/i.test(c.name));

  const metricCols = numericCols.filter(c =>
    ["revenue","sales","amount","price","total","profit","qty","units","count","value"].some(p => c.name.toLowerCase().includes(p))
  );
  const catCols = textCols.filter(c =>
    ["region","category","product","segment","type","name","rep","industry","variable"].some(p => c.name.toLowerCase().includes(p))
  );

  const metric = metricCols[0] || numericCols[0];
  const cat    = catCols[0] || textCols[0];

  // Very short / single word query
  const words = q.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1);
  if (words.length <= 2 && !/(table|all|show|list)/i.test(q)) {
    const options = [];
    if (dateCol && metric) options.push(`${metric.name} trend by ${dateCol.name}`);
    if (cat && metric)     options.push(`Top 5 ${cat.name} by ${metric.name}`);
    if (cat && metric)     options.push(`${metric.name} by ${cat.name} — bar chart`);
    if (cat && metric)     options.push(`${metric.name} distribution by ${cat.name} — pie chart`);
    options.push("Show all data as table");
    if (options.length > 0) return { needsClarification: true, question: `How would you like to explore "${query}"?`, options: options.slice(0, 5) };
  }

  // Mentions metric but no dimension/chart hint
  const hasMetricMention  = metric && q.includes(metric.name.toLowerCase());
  const hasCatMention     = cat && q.includes(cat.name.toLowerCase());
  const hasDateMention    = dateCol && q.includes(dateCol.name.toLowerCase());
  const hasChartHint      = /(trend|compare|top|pie|bar|line|distribution|breakdown|scatter|area|table)/i.test(q);

  if (hasMetricMention && !hasCatMention && !hasDateMention && !hasChartHint) {
    const options = [];
    if (dateCol)       options.push(`${metric.name} trend by ${dateCol.name}`);
    catCols.slice(0,3).forEach(c => options.push(`${metric.name} by ${c.name}`));
    options.push(`Top 5 by ${metric.name}`);
    return { needsClarification: true, question: `How would you like to break down "${metric.name}"?`, options: options.slice(0,5) };
  }

  // "compare/performance/analysis" with no subject
  if (/(compare|performance|analysis|overview)/i.test(q) && !hasCatMention && !hasDateMention) {
    const options = catCols.slice(0, 4).map(c => `Compare ${metric?.name || "value"} by ${c.name}`);
    if (options.length > 0) return { needsClarification: true, question: "What would you like to compare?", options };
  }

  return null;
}

// ─────────────────────────────────────────────
//  Retry
// ─────────────────────────────────────────────
async function withRetry(fn, maxRetries = 1, baseDelayMs = 3000) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      const is429 = err?.status === 429 || (err.message && (err.message.includes("429") || err.message.includes("Too Many Requests")));
      if (!is429) throw err;
      const delay = Math.min(baseDelayMs * attempt, 5000);
      console.warn(`[LLM] Rate limited. Attempt ${attempt}/${maxRetries}. Retrying in ${delay/1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ─────────────────────────────────────────────
//  Fuzzy resolver
// ─────────────────────────────────────────────
const FUZZY_SYNONYMS = {
  manager:["sales_rep","rep","agent","employee","staff"], employee:["sales_rep","rep","agent","staff"],
  seller:["sales_rep","rep"], q1:["quarter","month","period"], q2:["quarter","month","period"],
  q3:["quarter","month","period"], q4:["quarter","month","period"],
  yearly:["year","date","month"], monthly:["month","date","period"],
  earnings:["revenue","profit","sales","amount","value"], income:["revenue","profit","sales","value"],
  cost:["price","amount","cost"], orders:["quantity","sales","count","qty"],
  units:["quantity","qty","sales"], customers:["customer","client","name","buyer"],
  location:["region","city","country","area","zone"], area:["region","city","zone","territory"],
  zone:["region","territory","area"], type:["category","type","segment","class"],
  item:["product","item","sku","goods"],
};

function fuzzyResolveColumn(userTerm, columns) {
  const term  = userTerm.toLowerCase().trim();
  const exact = columns.find(c => c.name.toLowerCase() === term);
  if (exact) return exact;
  const partial = columns.find(c => c.name.toLowerCase().includes(term) || term.includes(c.name.toLowerCase()));
  if (partial) return partial;
  for (const syn of (FUZZY_SYNONYMS[term] || [])) {
    const m = columns.find(c => c.name.toLowerCase().includes(syn) || syn.includes(c.name.toLowerCase()));
    if (m) return m;
  }
  return null;
}

function resolveQueryColumns(query, columns) {
  const q = query.toLowerCase();
  const resolved = { catCol: null, metricCol: null };
  const words   = q.replace(/[^a-z0-9\s_]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const bigrams = words.map((w, i) => words[i+1] ? `${w} ${words[i+1]}` : null).filter(Boolean);
  for (const term of [...bigrams, ...words]) {
    const col = fuzzyResolveColumn(term, columns);
    if (col) {
      if (col.type === "TEXT" && !resolved.catCol) resolved.catCol = col;
      if ((col.type === "INTEGER" || col.type === "REAL") && !(/^year$/i.test(col.name)) && !resolved.metricCol) resolved.metricCol = col;
    }
  }
  return resolved;
}

// ─────────────────────────────────────────────
//  Hint + suggestions
// ─────────────────────────────────────────────
function buildHintMessage(query, schema) {
  const cols     = schema.columns;
  const words    = query.toLowerCase().replace(/[^a-z0-9\s_]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const STOP     = new Set(["show","me","the","top","by","for","and","with","from","give","list","find","what","which","how","many","much","all","data","chart","graph","table","pie","bar","line","area","trend"]);
  const corrections = [];
  for (const word of words) {
    if (STOP.has(word)) continue;
    const match = fuzzyResolveColumn(word, cols);
    if (match && match.name.toLowerCase() !== word) corrections.push(`"${word}" → try "${match.name}"`);
  }
  const numericCols = cols.filter(c => (c.type === "INTEGER" || c.type === "REAL") && !/^year$/i.test(c.name));
  const textCols    = cols.filter(c => c.type === "TEXT");
  const metricCol   = numericCols.find(c => ["revenue","sales","profit","amount","total","count","value"].some(p => c.name.toLowerCase().includes(p))) || numericCols[0];
  const catCol      = textCols.find(c => ["region","category","product","segment","type","name","rep"].some(p => c.name.toLowerCase().includes(p))) || textCols[0];
  const dateCol     = cols.find(c => /(date|month|year|time|period)/i.test(c.name));
  const suggestions = [];
  if (metricCol && catCol)  suggestions.push(`"Top 5 ${catCol.name} by ${metricCol.name}"`);
  if (metricCol && dateCol) suggestions.push(`"${metricCol.name} trend by ${dateCol.name}"`);
  if (metricCol && catCol)  suggestions.push(`"Compare ${metricCol.name} by ${catCol.name}"`);
  if (metricCol && catCol)  suggestions.push(`"${metricCol.name} distribution by ${catCol.name}"`);
  let hint = `Your data has these columns: ${cols.map(c=>c.name).join(", ")}.\n\n`;
  if (corrections.length > 0) hint += `Did you mean: ${corrections.join(", ")}?\n\n`;
  if (suggestions.length > 0) hint += `Try these instead:\n${suggestions.map(s=>`• ${s}`).join("\n")}`;
  return hint;
}

function generateSmartSuggestions(schema) {
  const cols        = schema.columns;
  const numericCols = cols.filter(c => (c.type === "INTEGER" || c.type === "REAL") && !/^year$/i.test(c.name));
  const textCols    = cols.filter(c => c.type === "TEXT");
  const dateCol     = cols.find(c => /(date|month|year|time|period|week|day)/i.test(c.name));
  const metric = numericCols.find(c => ["revenue","sales","amount","price","total","profit","qty","units","count","value"].some(p => c.name.toLowerCase().includes(p))) || numericCols[0];
  const cat    = textCols.find(c => ["region","category","product","segment","type","name","department","status","rep","industry"].some(p => c.name.toLowerCase().includes(p))) || textCols[0];
  const suggestions = [];
  if (dateCol && metric) suggestions.push(`Show ${metric.name} trend by ${dateCol.name}`);
  if (cat && metric)     suggestions.push(`Top 5 ${cat.name} by ${metric.name}`);
  if (cat && metric)     suggestions.push(`Compare ${metric.name} by ${cat.name}`);
  if (cat && metric)     suggestions.push(`${metric.name} distribution by ${cat.name} — pie chart`);
  if (numericCols.length >= 2) suggestions.push(`Correlation between ${numericCols[0].name} and ${numericCols[1].name}`);
  suggestions.push("Show all data as table");
  return suggestions.slice(0, 6);
}

// ─────────────────────────────────────────────
//  System prompt
// ─────────────────────────────────────────────
function buildSystemPrompt(schema) {
  const colDescriptions = schema.columns.map(c => `  - "${c.name}" (${c.type})`).join("\n");
  const sampleJSON      = JSON.stringify(schema.sampleRows, null, 2);
  const textColHints    = schema.columns
    .filter(c => c.type === "TEXT" && c.distinctValues?.length > 0)
    .map(c => `  - "${c.name}" has values like: ${c.distinctValues.slice(0,10).map(v=>`"${v}"`).join(", ")}`)
    .join("\n");

  return `You are a highly accurate Business Intelligence SQL expert. Convert natural language to correct SQLite queries.

DATABASE SCHEMA
Table: "${schema.tableName}"
Rows: ${schema.rowCount}

COLUMNS:
${colDescriptions}

${textColHints ? `KNOWN COLUMN VALUES:\n${textColHints}` : ""}

SAMPLE DATA:
${sampleJSON}

SQL RULES:
1. ALWAYS double-quote column and table names
2. ONLY use columns from the schema
3. ONLY write SELECT statements
4. GROUP BY all non-aggregated columns
5. Add LIMIT 100 unless asked for all data
6. For "top N" use ORDER BY metric DESC LIMIT N
7. Use strftime('%Y-%m', "date_col") to group by month
8. CAST INTEGER year columns to TEXT when used as labels: CAST("Year" AS TEXT)
9. Use WHERE to filter when specific variable/category is mentioned

CHART SELECTION RULES — choose the BEST visual for the data:
- "scatter"  → correlation, "vs", "versus", 2 numeric cols, "relationship between"
- "line"     → time series, trend, over time, monthly, yearly, by date/month/year
- "area"     → cumulative, running total, growth over time, accumulated
- "pie"      → proportion, share, %, composition, parts of whole, distribution (≤8 categories)
- "bar"      → top N, ranking, compare, breakdown, by category (when ≤20 categories)
- "table"    → raw data, list all, show records, export
- DEFAULT    → if unsure between bar and pie: use bar for >5 categories, pie for ≤5

OUTPUT: strict JSON only
{
  "canAnswer": true,
  "sql": "SELECT ...",
  "chartType": "bar|line|pie|area|scatter|table",
  "chartConfig": { "xKey": "col_alias", "yKey": "numeric_col_alias", "title": "title", "xLabel": "x", "yLabel": "y" },
  "insight": "2-sentence business insight with numbers.",
  "sqlExplanation": "Plain English explanation"
}

If ambiguous: { "needsClarification": true, "question": "...", "options": ["A","B","C"] }
If cannot answer: { "canAnswer": false, "reason": "specific reason" }
CRITICAL: xKey/yKey must exactly match column aliases in SELECT.`;
}

// ─────────────────────────────────────────────
//  Enrich schema
// ─────────────────────────────────────────────
function enrichSchema(schema, db) {
  if (!db) return schema;
  const enriched = { ...schema, columns: schema.columns.map(col => ({ ...col })) };
  for (const col of enriched.columns) {
    if (col.type === "TEXT") {
      try {
        const res = db.exec(`SELECT DISTINCT "${col.name}" FROM "${schema.tableName}" LIMIT 20`);
        if (res?.[0]) col.distinctValues = res[0].values.map(v => v[0]).filter(Boolean);
      } catch (_) {}
    }
  }
  return enriched;
}

// ─────────────────────────────────────────────
//  Main entry
// ─────────────────────────────────────────────
async function generateDashboard(userQuery, schema, conversationHistory = [], db = null) {
  const enriched = enrichSchema(schema, db);

  // Check ambiguity first
  const ambiguity = detectAmbiguity(userQuery, enriched);
  if (ambiguity) {
    console.log("[LLM] Ambiguous query:", userQuery);
    return ambiguity;
  }

  const historyContext = conversationHistory.length > 0
    ? `\nCONVERSATION HISTORY:\n` + conversationHistory.slice(-4).map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n") + "\n"
    : "";
  const fullPrompt = `${historyContext}\nUSER QUESTION: "${userQuery}"
Use ONLY these columns: ${enriched.columns.map(c=>`"${c.name}"`).join(", ")}
Table: "${enriched.tableName}"`;

  if (model) {
    try {
      const result = await withRetry(() =>
        model.generateContent({
          systemInstruction: buildSystemPrompt(enriched),
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.05, maxOutputTokens: 1500, responseMimeType: "application/json" },
        })
      );
      const raw    = result.response.text().trim();
      const parsed = safeParseJSON(raw);
      if (parsed) {
        parsed._source = "gemini";
        if (parsed.needsClarification) return parsed;
        if (parsed.sql) parsed.sql = fixTableName(parsed.sql, enriched.tableName);
        if (parsed.canAnswer === false) {
          parsed.hint        = buildHintMessage(userQuery, enriched);
          parsed.suggestions = generateSmartSuggestions(enriched);
        }
        return parsed;
      }
    } catch (err) {
      console.warn("[LLM] Gemini failed after retries:", err.message);
      console.warn("[LLM] Falling back to rule-based engine.");
    }
  } else {
    console.warn("[LLM] Gemini not initialised — using rule-based fallback.");
  }
  return ruleBased(userQuery, enriched);
}

function fixTableName(sql, tableName) {
  if (!sql.toLowerCase().includes(tableName.toLowerCase()))
    sql = sql.replace(/FROM\s+["']?\w+["']?/i, `FROM "${tableName}"`);
  return sql;
}

function validateLLMOutput(parsed, schema) {
  if (!parsed || typeof parsed !== "object") return { valid: false, reason: "Invalid response format." };
  if (parsed.needsClarification) return { valid: true, canAnswer: true, needsClarification: true };
  if (parsed.canAnswer === false) return { valid: true, canAnswer: false, reason: parsed.reason };
  if (!parsed.sql || typeof parsed.sql !== "string") return { valid: false, reason: "No SQL query produced." };
  if (!parsed.sql.trim().toUpperCase().startsWith("SELECT")) return { valid: false, reason: "Non-SELECT query rejected." };
  parsed.sql = fixTableName(parsed.sql, schema.tableName);
  return { valid: true, canAnswer: true };
}

// ─────────────────────────────────────────────
//  Rule-Based Fallback with smart chart selection
// ─────────────────────────────────────────────
function ruleBased(query, schema) {
  const q    = query.toLowerCase();
  const cols = schema.columns;

  const numericCols = cols.filter(c => (c.type === "INTEGER" || c.type === "REAL") && !/^year$/i.test(c.name));
  const textCols    = cols.filter(c => c.type === "TEXT");
  const dateCol     = cols.find(c => /(date|time|period|week|day)/i.test(c.name));
  const monthCol    = cols.find(c => /^month$/i.test(c.name));
  const yearCol     = cols.find(c => /^year$/i.test(c.name));
  const groupCol    = monthCol || dateCol || yearCol;

  const resolved  = resolveQueryColumns(query, cols);
  const metricPriority = ["revenue","sales","amount","price","total","count","value","profit","qty","units"];
  const catPriority    = ["region","category","product","segment","type","name","department","status","rep","industry","variable"];

  const metricCol = resolved.metricCol ||
    numericCols.find(c => metricPriority.some(p => c.name.toLowerCase().includes(p))) ||
    numericCols[0];
  const catCol = resolved.catCol ||
    textCols.find(c => catPriority.some(p => c.name.toLowerCase().includes(p))) ||
    textCols[0];

  const t = schema.tableName;
  const groupExpr = (col) => /^year$/i.test(col.name)
    ? `CAST("${col.name}" AS TEXT) as ${col.name}`
    : `"${col.name}"`;

  // Use smart chart selector
  const chartType = selectChartType(query, cols, catCol, metricCol, groupCol);

  // ── Scatter ──
  if (chartType === "scatter") {
    const mentionedNumerics = numericCols.filter(c => q.includes(c.name.toLowerCase()));
    const xCol = mentionedNumerics[0] || numericCols[0];
    const yCol = mentionedNumerics[1] || numericCols[1];
    if (!xCol || !yCol) return cannotAnswerWithHint(query, schema, "Need two numeric columns for a scatter plot.");
    return {
      canAnswer: true, _source: "fallback",
      sql: `SELECT "${xCol.name}", "${yCol.name}" FROM "${t}" LIMIT 200`,
      chartType: "scatter",
      chartConfig: { xKey: xCol.name, yKey: yCol.name, title: `${xCol.name} vs ${yCol.name}`, xLabel: xCol.name, yLabel: yCol.name },
      insight: `Scatter plot showing relationship between ${xCol.name} and ${yCol.name}.`,
      sqlExplanation: `Returns ${xCol.name} and ${yCol.name} for correlation analysis.`,
    };
  }

  // ── Line / Area ──
  if (chartType === "line" || chartType === "area") {
    if (!groupCol) return cannotAnswerWithHint(query, schema, "No date, month or year column found for time series.");
    if (!metricCol) return cannotAnswerWithHint(query, schema, "No numeric metric column found.");
    return {
      canAnswer: true, _source: "fallback",
      sql: `SELECT ${groupExpr(groupCol)}, SUM("${metricCol.name}") as total FROM "${t}" GROUP BY "${groupCol.name}" ORDER BY "${groupCol.name}" ASC LIMIT 100`,
      chartType,
      chartConfig: { xKey: groupCol.name, yKey: "total", title: `${metricCol.name} ${chartType === "area" ? "growth" : "trend"} by ${groupCol.name}`, xLabel: groupCol.name, yLabel: metricCol.name },
      insight: `Showing ${metricCol.name} over time grouped by ${groupCol.name}.`,
      sqlExplanation: `Sums ${metricCol.name} per ${groupCol.name}.`,
    };
  }

  // ── Pie ──
  if (chartType === "pie") {
    if (!catCol || !metricCol) return cannotAnswerWithHint(query, schema, "Need a category and metric column for a pie chart.");
    return {
      canAnswer: true, _source: "fallback",
      sql: `SELECT "${catCol.name}", SUM("${metricCol.name}") as total FROM "${t}" GROUP BY "${catCol.name}" ORDER BY total DESC LIMIT 8`,
      chartType: "pie",
      chartConfig: { xKey: catCol.name, yKey: "total", title: `${metricCol.name} share by ${catCol.name}`, xLabel: catCol.name, yLabel: metricCol.name },
      insight: `Proportional breakdown of ${metricCol.name} by ${catCol.name}.`,
      sqlExplanation: `Groups ${metricCol.name} by ${catCol.name}, top 8.`,
    };
  }

  // ── Bar ──
  if (chartType === "bar") {
    const nMatch = q.match(/top\s*(\d+)/);
    const limit  = nMatch ? parseInt(nMatch[1]) : 20;
    const useCat = textCols.find(c => q.includes(`by ${c.name.toLowerCase()}`)) || catCol;
    if (!useCat || !metricCol) return cannotAnswerWithHint(query, schema, "Need category and metric columns for a bar chart.");
    return {
      canAnswer: true, _source: "fallback",
      sql: `SELECT "${useCat.name}", SUM("${metricCol.name}") as total FROM "${t}" GROUP BY "${useCat.name}" ORDER BY total DESC LIMIT ${limit}`,
      chartType: "bar",
      chartConfig: { xKey: useCat.name, yKey: "total", title: `${metricCol.name} by ${useCat.name}`, xLabel: useCat.name, yLabel: metricCol.name },
      insight: `Comparison of ${metricCol.name} across ${useCat.name}.`,
      sqlExplanation: `Groups ${metricCol.name} by ${useCat.name}, ordered by value.`,
    };
  }

  // ── Table ──
  if (chartType === "table") {
    if (/(total|sum|overall)/i.test(q) && metricCol) {
      return {
        canAnswer: true, _source: "fallback",
        sql: `SELECT SUM("${metricCol.name}") as total FROM "${t}"`,
        chartType: "table",
        chartConfig: { xKey: "total", yKey: "total", title: `Total ${metricCol.name}`, xLabel: "", yLabel: "" },
        insight: `Total aggregate of ${metricCol.name} across all records.`,
        sqlExplanation: `Sums all values in ${metricCol.name}.`,
      };
    }
    return {
      canAnswer: true, _source: "fallback",
      sql: `SELECT * FROM "${t}" LIMIT 50`,
      chartType: "table",
      chartConfig: { xKey: cols[0]?.name, yKey: metricCol?.name || cols[1]?.name, title: "Data overview", xLabel: "", yLabel: "" },
      insight: "Showing a preview of your uploaded data.",
      sqlExplanation: "Returns first 50 rows.",
    };
  }

  // Fallback default
  return {
    canAnswer: true, _source: "fallback",
    sql: `SELECT * FROM "${t}" LIMIT 50`,
    chartType: "table",
    chartConfig: { xKey: cols[0]?.name, yKey: metricCol?.name || cols[1]?.name, title: "Data overview", xLabel: "", yLabel: "" },
    insight: "Showing a preview of your uploaded data.",
    sqlExplanation: "Returns first 50 rows.",
  };
}

function cannotAnswerWithHint(query, schema, reason) {
  return { canAnswer: false, _source: "fallback", reason, hint: buildHintMessage(query, schema), suggestions: generateSmartSuggestions(schema) };
}

function safeParseJSON(raw) {
  try {
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/g, "").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

module.exports = { generateDashboard, validateLLMOutput, generateSmartSuggestions };