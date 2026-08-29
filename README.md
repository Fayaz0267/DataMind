# 🧠 Conversational BI Dashboard
> Ask your data anything in plain English. Get instant, interactive dashboards.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Natural Language → SQL** | Gemini 1.5 Flash converts plain English to SQLite queries |
| **Auto Chart Selection** | Line for trends, Bar for comparisons, Pie for proportions |
| **CSV Upload** | Drag & drop any CSV — becomes a queryable SQLite table instantly |
| **Hallucination Guard** | AI explicitly says "I don't know" instead of making up data |
| **Conversational Follow-ups** | "Now filter by East region" — history-aware chat context |
| **Fallback Engine** | Rule-based SQL generator if Gemini fails |
| **Modern UI** | Glassmorphism dark theme, smooth animations |

## 🧪 Test with Sample Data

A sample CSV is included: `sample_sales_data.csv`

Upload it and try these queries:
1. `"Show me monthly revenue as a line chart"`
2. `"Which region has the highest total sales? Show as a bar chart"`
3. `"Show the distribution of revenue by product category as a pie chart"`
4. `"Who is the top performing sales rep?"` (follow-up: `"Now show only the North region"`)

---

## 🏗️ Architecture

```
User Types Query
      │
      ▼
Next.js Frontend (port 3000)
      │  POST /api/query { query, sessionId }
      ▼
Express Backend (port 4000)
      │
      ├── LLM Service (services/llm.js)
      │     ├── Gemini 1.5 Flash (primary)
      │     │     └── Schema-aware system prompt
      │     │     └── Returns SQL + chart type + insight
      │     └── Rule-based fallback (if Gemini fails)
      │
      ├── Hallucination Guard (validateLLMOutput)
      │
      ├── SQLite Execution (services/database.js)
      │     └── In-memory DB per session
      │     └── Only SELECT queries allowed
      │
      └── Response: { data, chartType, chartConfig, insight, sql }
            │
            ▼
      Recharts renders correct chart type
```

---

## 📁 Project Structure

```
bi-dashboard/
├── backend/
│   ├── server.js              # Express entry point
│   ├── routes/
│   │   ├── upload.js          # CSV upload → SQLite
│   │   ├── query.js           # NL query → chart data
│   │   └── session.js         # Session management
│   └── services/
│       ├── llm.js             # Gemini + fallback engine
│       └── database.js        # SQLite session store
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   └── index.jsx      # Main app page
│       ├── components/
│       │   ├── ui/
│       │   │   ├── Header.jsx
│       │   │   ├── CSVDropzone.jsx
│       │   │   ├── QueryInput.jsx
│       │   │   ├── DashboardSkeleton.jsx
│       │   │   └── HistoryPanel.jsx
│       │   ├── charts/
│       │   │   └── ChartRenderer.jsx  # Line/Bar/Pie/Area/Scatter/Table
│       │   └── dashboard/
│       │       └── DashboardCard.jsx  # Result card
│       ├── lib/
│       │   ├── api.js          # Axios client
│       │   └── chartConfig.js  # Colors, formatters
│       └── styles/
│           └── globals.css     # Glassmorphism theme
│
└── sample_sales_data.csv       # Test dataset
```


## 🚢 Deployment (Vercel + Railway)

---

Built with ❤️ using Gemini 1.5 Flash, Node.js, Next.js, and Recharts.
