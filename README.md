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

---

## 🚀 Getting Started in 5 Minutes

### Step 1: Get Your FREE Gemini API Key

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

> ✅ The free tier gives you **60 requests/minute** — more than enough for this app.

---

### Step 2: Set Up the Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and paste your Gemini key:
```
GEMINI_API_KEY=AIzaSy...your_key_here
```

Start the backend:
```bash
npm run dev
```

You should see:
```
🚀 BI Dashboard backend running on http://localhost:4000
   Gemini key: ✅ loaded
```

---

### Step 3: Set Up the Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Start the frontend:
```bash
npm run dev
```

Open **http://localhost:3000** 🎉

---

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

---

## 🎯 Evaluation Criteria Coverage

### Accuracy (40%)
- ✅ Schema-injected system prompt prevents hallucinated column names
- ✅ SQL validator blocks non-SELECT queries
- ✅ `canAnswer: false` returned when data is unavailable
- ✅ SQL retry on execution failure

### Aesthetics & UX (30%)
- ✅ Glassmorphism dark UI with Syne + DM Sans fonts
- ✅ Shimmer skeleton loading state
- ✅ Hover tooltips on all charts
- ✅ Smooth CSS animations

### Innovation (30%)
- ✅ Schema-aware RAG (schema injected as context)
- ✅ Multi-turn conversation history (last 4 turns included in prompt)
- ✅ Dual-engine: Gemini + rule-based fallback
- ✅ Hallucination guard with explicit rejection

### Bonus (30%)
- ✅ Conversational follow-ups (history-aware)
- ✅ CSV upload (fully data-agnostic)

---

## 🔧 Troubleshooting

| Issue | Fix |
|---|---|
| `GEMINI_API_KEY missing` | Add key to `backend/.env` |
| `Session not found` | Re-upload CSV (sessions are in-memory) |
| `CORS error` | Check `FRONTEND_URL` in `backend/.env` |
| Chart shows no data | Try rephrasing: "Show revenue by region as bar chart" |
| Port conflict | Change PORT in `.env` and `NEXT_PUBLIC_API_URL` |

---

## 🚢 Deployment (Vercel + Railway)

**Backend → Railway:**
```bash
# In Railway dashboard, add env var: GEMINI_API_KEY
# Set FRONTEND_URL to your Vercel URL
railway up
```

**Frontend → Vercel:**
```bash
# Add env var: NEXT_PUBLIC_API_URL = https://your-railway-url.up.railway.app
vercel deploy
```

---

Built with ❤️ using Gemini 1.5 Flash, Node.js, Next.js, and Recharts.
