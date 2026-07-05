# 🛡️ Aegis Attendance

**AI-powered student attendance analytics, eligibility prediction, and recovery planning.** 📊🎓

**Stack:** 🟢 Node.js · 🚂 Express · 🐘 PostgreSQL · 🔷 Prisma ORM · 🤖 Groq (llama-3.3-70b-versatile) · 🎨 Vanilla HTML/CSS/JS · 📈 Chart.js

---

## ✨ Features

- 📊 **Dashboard** — institute-wide attendance metrics, department comparison chart, live check-in feed
- 🧑‍🎓 **Student Portal** — radial attendance indicator, subject-wise breakdown, AI-powered predictions, recovery calculator
- 👩‍🏫 **Faculty Portal** — searchable/filterable student registry, bulk CSV/Excel import, notification simulator
- 🤖 **Aegis AI Agent** — four Groq-powered endpoints (analysis, recovery plan, recommendations, multi-turn chat) with deterministic fallback
- ⚙️ **12-factor config** — all secrets via environment variables; works locally, on Render, and on Railway

---

## 🏗️ Architecture

### Block diagram

![Aegis Attendance architecture](docs/architecture-diagram.png)

*Browser SPA → Express API (student routes, AI routes, Prisma client) → PostgreSQL, with AI routes calling Groq and falling back to deterministic logic; the client falls back to cached local data if the API is unreachable.*

### Mermaid version (renders natively on GitHub)

```mermaid
flowchart TD
    U["🧑‍🎓 Browser / SPA<br/>index.html · app.js · api.js"] -->|fetch()| API["🚂 Express API<br/>backend/src/index.js"]

    API --> HR["❤️ /api/health"]
    API --> SR["👥 /api/students"]
    API --> AR["🤖 /api/ai/*"]

    SR --> PRISMA["🔷 Prisma Client"]
    HR --> PRISMA
    PRISMA --> DB[("🐘 PostgreSQL")]

    AR --> GROQ["🧠 Groq SDK<br/>llama-3.3-70b-versatile"]
    AR -.fallback if no key / offline.-> DET["🧮 Deterministic Fallback<br/>(attendanceMetrics.js)"]

    U -.if backend unreachable.-> MOCK["📦 mockData.js /<br/>localStorage snapshot"]

    style U fill:#1e293b,stroke:#38bdf8,color:#fff
    style API fill:#1e293b,stroke:#22c55e,color:#fff
    style DB fill:#1e293b,stroke:#f59e0b,color:#fff
    style GROQ fill:#1e293b,stroke:#a855f7,color:#fff
    style MOCK fill:#1e293b,stroke:#64748b,color:#fff
    style DET fill:#1e293b,stroke:#64748b,color:#fff
```

---

## 📁 Project Structure

```
aegis-attendance/
├── 🌐 index.html          # Frontend SPA entry point
├── 🎨 styles.css          # Design system (dark glassmorphism)
├── ⚙️ app.js              # Application logic (rendering + data layer)
├── 🔌 api.js              # AegisAPI client (all fetch() calls)
├── 📦 mockData.js         # Static fallback / seed source
├── 🐳 Dockerfile          # Multi-stage build; Express serves frontend + API
├── 🚫 .dockerignore
├── ☁️ render.yaml         # Render Blueprint (web service + PostgreSQL)
├── 🚂 railway.toml        # Railway deployment config
└── 📂 backend/
    ├── 📦 package.json
    ├── 🔷 prisma/
    │   ├── schema.prisma   # Student + Subject models
    │   └── seed.js         # Seeds 6 mock students
    └── 🧠 src/
        ├── index.js                     # Express entry point
        ├── lib/
        │   ├── prisma.js                # PrismaClient singleton
        │   └── groq.js                  # Groq SDK singleton
        ├── middleware/
        │   └── errorHandler.js
        ├── routes/
        │   ├── health.js                # GET  /api/health
        │   ├── students.js              # CRUD /api/students
        │   └── ai.js                    # POST /api/ai/*
        └── services/
            └── attendanceMetrics.js     # Pure attendance math (server-side)
```

---

## 💻 Local Development

### ✅ Prerequisites

- 🟢 Node.js ≥ 18
- 🐘 PostgreSQL 14+ running locally (or Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16-alpine`)

### 1️⃣ — Clone and install

```bash
git clone <your-repo-url>
cd aegis-attendance/backend
npm install
```

### 2️⃣ — Configure environment

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/aegis_attendance?schema=public"
GROQ_API_KEY=your_groq_api_key_here    # https://console.groq.com
GROQ_MODEL=llama-3.3-70b-versatile
CORS_ORIGIN=*
```

### 3️⃣ — Set up the database

```bash
# Create the database schema
npm run db:push

# Seed with 6 mock students
npm run db:seed
```

### 4️⃣ — Start the backend

```bash
npm run dev
# 🚀 API running at http://localhost:4000
```

### 5️⃣ — Open the frontend

Open `index.html` directly in your browser (double-click) or serve it:

```bash
# From the repo root
npx http-server . -p 8080
# Then visit http://localhost:8080
```

The frontend auto-detects `localhost` and points to `http://localhost:4000`.

---

## 📡 API Reference

All responses follow `{ success: boolean, data: any }` or `{ success: false, error: { message } }`.

### ❤️ Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness + DB connectivity check |

### 👥 Students

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/students` | List all students (includes subjects) |
| GET | `/api/students/:id` | Get single student |
| POST | `/api/students` | Create student |
| PUT | `/api/students/:id` | Replace student |
| PATCH | `/api/students/:id/checkin` | Record one class session `{ subjectId, present }` |
| DELETE | `/api/students/:id` | Delete student |
| POST | `/api/students/bulk` | Upsert many `{ students: [...] }` |

### 🤖 AI (Groq)

All AI routes accept `{ studentId, config?: { threshold, borderlineLimit, criticalLimit } }`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/analyze` | 📝 Narrative attendance analysis |
| POST | `/api/ai/recovery` | 🩹 Step-by-step recovery plan |
| POST | `/api/ai/recommendations` | ✅ 4 actionable bullet points |
| POST | `/api/ai/chat` | 💬 Multi-turn agent chat `{ studentId, message, history? }` |

---

## 🚀 Deployment

### ☁️ Render (recommended)

1. 📤 Push to GitHub
2. In Render dashboard → **New → Blueprint** → point at `render.yaml`
3. 🐘 Render provisions PostgreSQL and the web service automatically
4. 🔑 Set `GROQ_API_KEY` in **Environment** (the only secret not auto-injected)
5. 🌱 After first deploy, run the seed via Render Shell:
   ```bash
   cd backend && npm run db:seed
   ```

### 🚂 Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. `railway login && railway init`
3. 🐘 Add a **PostgreSQL** plugin in the Railway dashboard — it auto-sets `DATABASE_URL`
4. 🔑 Set `GROQ_API_KEY` in Railway → Variables
5. `railway up`
6. 🌱 Seed: `railway run npm run db:seed` (from `backend/` directory)

### 🐳 Docker (self-hosted)

```bash
# Build
docker build -t aegis-attendance .

# Run (pass secrets as env vars)
docker run -p 4000:4000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:pass@host:5432/aegis_attendance" \
  -e GROQ_API_KEY="your_key" \
  aegis-attendance
```

Then visit `http://localhost:4000` 🎉

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | `4000` | HTTP port |
| `NODE_ENV` | ❌ No | `development` | `production` enables static file serving |
| `DATABASE_URL` | ✅ **Yes** | — | PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ **Yes** | — | From https://console.groq.com |
| `GROQ_MODEL` | ❌ No | `llama-3.3-70b-versatile` | Any Groq-supported model |
| `CORS_ORIGIN` | ❌ No | `*` | Restrict to your frontend origin in production |

---

## 🌙 Offline / Fallback Mode

If the backend is unreachable 📴 the frontend automatically falls back to the in-memory student list (loaded from `mockData.js` or the last `localStorage` snapshot). All charts, calculations, and the UI remain fully functional — only the AI chat and live check-in persistence are disabled, with silent toast-free degradation. 🤫

---

## 🧮 Attendance Math

### 📊 Overall %
$$\text{Rate} = \frac{\text{Present Days}}{\text{Total Working Days}} \times 100$$

### 🔁 Consecutive classes needed to recover
$$x = \left\lceil \frac{\theta \cdot W - P}{1 - \theta} \right\rceil$$

### 📈 Minimum future attendance rate
$$f = \frac{\max(0,\, \lceil\theta(W+R)\rceil - P)}{R} \times 100$$

If the numerator exceeds $R$, recovery is flagged as **⚠️ mathematically impossible**.

### 📉 Trend classification
Compares the mean of the last 2 weekly entries against the prior weeks.

| Difference | Trend |
|---|---|
| > 5 pp | 📈 IMPROVING |
| < −5 pp | 📉 DECLINING |
| otherwise | ➖ STABLE |
