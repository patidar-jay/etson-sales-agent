# Etson AI Sales Agent 🚀

Autonomous AI sales agent for **Etson Manufacturing** (thermal paper rolls).  
Powered by **Sarvam AI** (voice calls) + **Whatomate** (WhatsApp) + **SQLite** (local data).

---

## ⚡ Quick Start (First Time Setup — ~10 minutes)

### Prerequisites
- Node.js 18+
- Docker (for Whatomate WhatsApp gateway)
- A Sarvam AI account at [indus.sarvam.ai](https://indus.sarvam.ai)

---

### Step 1 — Clone & Install

```bash
git clone <your-repo-url>
cd etson-sales-agent

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

---

### Step 2 — Configure Environment

```bash
cd backend
cp .env.example .env   # if .env doesn't exist
```

Open `backend/.env` and fill in:

```env
# ── REQUIRED (already pre-filled — verify these) ─────────────────────
SARVAM_API_KEY=sk_samvaad_nonohlhc_S5XJKo9BcfToD8DnuciU0TGf
SARVAM_AGENT_ID=Conversatio-8eaeaf2f-9a7a
SARVAM_ORG_ID=01a070e6-bd52-736f-8f9c-9ddb8178a4f8
SARVAM_WORKSPACE_ID=01a070e6-bd63-78b6-8726-3336ed438ced
SARVAM_APP_ID=Conversatio-8eaeaf2f-9a7a
SALES_TEAM_WHATSAPP=916267178440

# ── REQUIRED — setup once (see Step 3) ───────────────────────────────
WHATOMATE_API_KEY=           ← get from http://localhost:8080 after Step 3

# ── OPTIONAL ─────────────────────────────────────────────────────────
OPENAI_API_KEY=              ← for AI follow-up message generation
SMTP_USER=                   ← Gmail address for email alerts
SMTP_PASS=                   ← Gmail App Password (not your Gmail password)
```

---

### Step 3 — Setup Whatomate (WhatsApp Gateway)

> Skip this if WhatsApp messaging is not needed. The app runs without it.

```bash
# Start Whatomate and its Postgres database
docker-compose up -d whatomate
```

1. Open **http://localhost:8080**
2. Scan the QR code with WhatsApp on phone number `916267178440`
3. Go to **Settings → API Keys → Create**
4. Copy the key → paste into `backend/.env` as `WHATOMATE_API_KEY=`

---

### Step 4 — Start Everything

```bash
cd /home/patidar_jay/projects/etson-sales-agent
./start.sh
```

You'll see:
```
✅ Backend:  http://localhost:3001
✅ Frontend: http://localhost:5173
🌐 Tunnel:   https://etson-sarvam.loca.lt ✅
```

Open **http://localhost:5173** → dashboard is live!

---

### Step 5 — Connect Sarvam Webhook (One Time Only)

1. Go to [indus.sarvam.ai](https://indus.sarvam.ai)
2. Click your **Sales Discovery** agent → **Tools** tab
3. Click **log_discovery_outcome** → Edit
4. Set the API URL to:
   ```
   https://etson-sarvam.loca.lt/api/webhooks/sarvam
   ```
5. Click **Save**

> ✅ This URL **never changes** — you only do this once.  
> Every time a Sarvam call ends, lead data auto-appears in your dashboard.

---

## 🔄 Daily Usage (After First Setup)

```bash
cd /home/patidar_jay/projects/etson-sales-agent
./start.sh
```

That's it. Opens:
- 📊 Dashboard → http://localhost:5173
- ⚙️ API → http://localhost:3001
- 🌐 Sarvam Webhook → https://etson-sarvam.loca.lt/api/webhooks/sarvam (always live)

---

## 🏗️ Architecture

```
Sarvam AI (voice call)
    ↓ POST /api/webhooks/sarvam
Backend (Express + SQLite)
    ↓ stores lead + score
Frontend (React + Vite)
    ↓ displays dashboard
Whatomate (Docker)
    ↓ sends WhatsApp messages
```

| Layer | Tech |
|---|---|
| Voice AI | Sarvam AI — Saaras v4 STT · Bulbul TTS · Sarvam-105B LLM |
| Frontend | React + Vite · Vanilla CSS glassmorphism · Recharts |
| Backend | Node.js · Express · Better-SQLite3 |
| WhatsApp | Whatomate (self-hosted Docker gateway) |
| Tunnel | localtunnel (fixed subdomain: `etson-sarvam`) |
| PDF Quotes | jsPDF + jspdf-autotable |

---

## 📁 Project Structure

```
etson-sales-agent/
├── start.sh                  ← one-command startup
├── docker-compose.yml        ← production Docker setup
├── backend/
│   ├── .env                  ← your secrets (never commit this)
│   ├── .env.example          ← template for new setups
│   ├── src/
│   │   ├── config/
│   │   │   └── localdb.js    ← SQLite database + schema
│   │   ├── routes/
│   │   │   ├── webhooks.js   ← Sarvam call webhook receiver
│   │   │   ├── leads.js      ← lead CRUD + scoring
│   │   │   ├── campaigns.js  ← outbound campaign management
│   │   │   ├── quotes.js     ← quote generation + approval
│   │   │   ├── whatsapp.js   ← WhatsApp inbox + messages
│   │   │   ├── analytics.js  ← dashboard stats
│   │   │   ├── callLogs.js   ← Sarvam call history
│   │   │   ├── followups.js  ← follow-up scheduler
│   │   │   └── settings.js   ← app configuration
│   │   └── services/
│   │       ├── sarvam.js     ← Sarvam API (calls + analytics)
│   │       ├── whatomate.js  ← WhatsApp send service
│   │       ├── ai.js         ← OpenAI transcript analysis
│   │       └── followups.js  ← follow-up scheduler engine
└── frontend/
    └── src/
        ├── pages/
        │   ├── Home.jsx        ← dashboard + stats
        │   ├── Leads.jsx       ← lead list + filter
        │   ├── LeadDetail.jsx  ← lead detail + inline edit
        │   ├── Campaigns.jsx   ← campaign management
        │   ├── Quotes.jsx      ← quote builder
        │   ├── Analytics.jsx   ← charts + funnel
        │   ├── CallLogs.jsx    ← Sarvam call history
        │   ├── WhatsApp.jsx    ← WhatsApp inbox
        │   └── Settings.jsx    ← full settings panel
        └── services/
            └── api.js          ← all API calls
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `SARVAM_API_KEY` | ✅ | Sarvam API key from indus.sarvam.ai |
| `SARVAM_AGENT_ID` | ✅ | Your Sales Discovery agent ID |
| `SARVAM_ORG_ID` | ✅ | From your Sarvam agent URL |
| `SARVAM_WORKSPACE_ID` | ✅ | From your Sarvam agent URL |
| `SARVAM_APP_ID` | ✅ | Same as AGENT_ID usually |
| `WHATOMATE_API_KEY` | ✅ | From http://localhost:8080 → API Keys |
| `WHATOMATE_URL` | ✅ | Default: `http://localhost:8080` |
| `SALES_TEAM_WHATSAPP` | ✅ | Your WhatsApp number (no + or spaces) |
| `OPENAI_API_KEY` | Optional | For AI follow-up messages |
| `SMTP_USER` | Optional | Gmail for email alerts |
| `SMTP_PASS` | Optional | Gmail App Password |

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| `503 - Tunnel Unavailable` in Sarvam | Run `./start.sh` — tunnel must be running |
| Backend won't start | Check `cat /tmp/etson-backend.log` |
| WhatsApp not sending | Set up Whatomate (Step 3) + add API key to `.env` |
| Call Logs page empty | Verify `SARVAM_ORG_ID`, `WORKSPACE_ID`, `APP_ID` in `.env` |
| Tunnel URL changed | It won't — subdomain `etson-sarvam` is fixed |
| Port 3001 already in use | `fuser -k 3001/tcp` then re-run `./start.sh` |

---

## 🐳 Production Deployment (DigitalOcean)

```bash
# On your server
git clone <repo-url> && cd etson-sales-agent
cp backend/.env.example backend/.env  # fill in keys
docker-compose up -d --build

# Set Sarvam webhook to your domain:
# https://yourdomain.com/api/webhooks/sarvam
```

---

*Built with Sarvam AI · Whatomate · SQLite · September 2026*
