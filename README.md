# Etson AI Sales Discovery System 🚀

An AI-assisted sales qualification and lead management system for **Etson Manufacturing** (thermal paper rolls).

The AI agent (powered by **Sarvam AI**) conducts structured discovery calls in Hindi/English, captures product requirements, scores leads, and prepares quotation drafts for human approval.

---

## 🏗️ Architecture

```
frontend/   → React + Vite dashboard (Port 5173)
backend/    → Express API server (Port 3001)
```

| Layer | Technology |
|-------|-----------|
| **Voice AI** | Sarvam AI (Saaras v4 STT · Bulbul v3 TTS · Sarvam-105B LLM) |
| **Frontend** | React + Vite · Vanilla CSS (dark glassmorphism) · Recharts |
| **Backend** | Node.js · Express · Firebase Firestore |
| **Email** | Nodemailer (Resend-compatible) |
| **PDF Quotes** | jsPDF + jspdf-autotable |

---

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env    # fill in your API keys
npm run dev             # runs on http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev             # runs on http://localhost:5173
```

---

## 📦 Features

- 📞 **AI Voice Calls** — Sarvam AI agent calls leads in Hindi/Hinglish
- 📊 **2-Layer Lead Scoring** — Hard gates + 100-point priority score + confidence
- 📋 **Quote Drafts** — AI drafts → human approves → sent to prospect
- 📁 **Campaign Management** — Upload Excel, run outbound campaigns
- 📈 **Analytics Dashboard** — Funnel, trends, city/product breakdown
- ⚙️ **Settings** — Webhooks, API keys, Access tokens, WhatsApp agents

---

## 🔑 Environment Variables

See [`backend/.env.example`](backend/.env.example) for all required variables.

Key variables:
```
SARVAM_API_KEY=
SARVAM_AGENT_ID=
FIREBASE_PROJECT_ID=
RESEND_API_KEY=
WHATSAPP_ACCESS_TOKEN=
```

---

## 📋 Compliance

This system includes TRAI/DLT compliance controls:
- DND/NDNC check before every outbound call
- Consent source required for each contact
- Calling hours enforced: 9 AM – 9 PM only
- AI discloses itself as AI in opening
- Human approval required for all quotations

---

## 📁 Project Structure

```
etson-sales-agent/
├── backend/
│   ├── src/
│   │   ├── config/         # Firebase config
│   │   ├── routes/         # campaigns, leads, quotes, products, analytics, webhooks
│   │   ├── services/       # scoring, quoteGenerator, email
│   │   ├── store/          # in-memory store (dev mode)
│   │   └── utils/          # Excel parser
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/     # Sidebar, Modal, Badge, StatCard, ScoreDisplay, FileUpload
│       ├── pages/          # Home, Campaigns, Leads, LeadDetail, Quotes, Analytics, Settings
│       ├── services/       # api.js
│       └── data/           # mockData.js
└── README.md
```

---

*Built with Sarvam AI · September 2026*
