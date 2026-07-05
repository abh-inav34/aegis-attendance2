 [...] }

🤖 AI (Groq)

All AI routes accept { studentId, config?: { threshold, borderlineLimit, criticalLimit } }.

MethodPathDescriptionPOST/api/ai/analyze📝 Narrative attendance analysisPOST/api/ai/recovery🩹 Step-by-step recovery planPOST/api/ai/recommendations✅ 4 actionable bullet pointsPOST/api/ai/chat💬 Multi-turn agent chat { studentId, message, history? }


🚀 Deployment

☁️ Render (recommended)


📤 Push to GitHub
In Render dashboard → New → Blueprint → point at render.yaml
🐘 Render provisions PostgreSQL and the web service automatically
🔑 Set GROQ_API_KEY in Environment (the only secret not auto-injected)
🌱 After first deploy, run the seed via Render Shell:


bash   cd backend && npm run db:seed

🚂 Railway


Install Railway CLI: npm i -g @railway/cli
railway login && railway init
🐘 Add a PostgreSQL plugin in the Railway dashboard — it auto-sets DATABASE_URL
🔑 Set GROQ_API_KEY in Railway → Variables
railway up
🌱 Seed: railway run npm run db:seed (from backend/ directory)


🐳 Docker (self-hosted)

bash# Build
docker build -t aegis-attendance .

# Run (pass secrets as env vars)
docker run -p 4000:4000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:pass@host:5432/aegis_attendance" \
  -e GROQ_API_KEY="your_key" \
  aegis-attendance

Then visit http://localhost:4000 🎉


🔐 Environment Variables

VariableRequiredDefaultDescriptionPORT❌ No4000HTTP portNODE_ENV❌ Nodevelopmentproduction enables static file servingDATABASE_URL✅ Yes—PostgreSQL connection stringGROQ_API_KEY✅ Yes—From https://console.groq.comGROQ_MODEL❌ Nollama-3.3-70b-versatileAny Groq-supported modelCORS_ORIGIN❌ No*Restrict to your frontend origin in production


🌙 Offline / Fallback Mode

If the backend is unreachable 📴 the frontend automatically falls back to the in-memory student list (loaded from mockData.js or the last localStorage snapshot). All charts, calculations, and the UI remain fully functional — only the AI chat and live check-in persistence are disabled, with silent toast-free degradation. 🤫


🧮 Attendance Math

📊 Overall %

Rate=Present DaysTotal Working Days×100\text{Rate} = \frac{\text{Present Days}}{\text{Total Working Days}} \times 100Rate=Total Working DaysPresent Days​×100
🔁 Consecutive classes needed to recover

x=⌈θ⋅W−P1−θ⌉x = \left\lceil \frac{\theta \cdot W - P}{1 - \theta} \right\rceilx=⌈1−θθ⋅W−P​⌉
📈 Minimum future attendance rate

f=max⁡(0, ⌈θ(W+R)⌉−P)R×100f = \frac{\max(0,\, \lceil\theta(W+R)\rceil - P)}{R} \times 100f=Rmax(0,⌈θ(W+R)⌉−P)​×100
If the numerator exceeds RR
R, recovery is flagged as ⚠️ mathematically impossible.

📉 Trend classification

Compares the mean of the last 2 weekly entries against the prior weeks.

DifferenceTrend> 5 pp📈 IMPROVING< −5 pp📉 DECLININGotherwise➖ STABLE
