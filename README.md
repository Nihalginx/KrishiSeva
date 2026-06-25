# 🌾 KrishiSeva — Smart Farm Platform

A full-stack farmer web application with AI crop diagnosis, live market prices, pesticide/fertilizer guidance, and a personal farm dashboard.

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Open .env and set your ANTHROPIC_API_KEY
```

### 3. Start the server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 4. Open in browser
```
http://localhost:3000
```

**Demo login:** Phone `9876543210` · Password `farmer123`

---

## 🗂 Project Structure

```
krishiseva/
├── server.js              # Express entry point (routes, middleware, startup)
├── .env.example           # Environment variable template
├── package.json
│
├── db/
│   └── setup.js           # SQLite schema + seed data (auto-runs on first start)
│
├── middleware/
│   └── auth.js            # JWT verification middleware
│
├── routes/
│   ├── auth.js            # POST /register, POST /login, GET /me, PUT /profile
│   ├── market.js          # GET /prices, GET /buyers, CRUD /listings
│   ├── dashboard.js       # GET /overview, /weather, /health, /alerts, /earnings
│   ├── tasks.js           # CRUD + PATCH /toggle for farm tasks
│   ├── crops.js           # GET /crops/:crop/pesticides + /fertilizers
│   └── chat.js            # POST /chat (Anthropic AI proxy), GET /history
│
└── public/
    └── index.html         # Full frontend (HTML/CSS/JS — no framework)
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Body | Auth |
|--------|----------|------|------|
| POST | `/api/auth/register` | `{ name, phone, password, village?, district?, state?, land_acres? }` | — |
| POST | `/api/auth/login` | `{ phone, password }` | — |
| GET  | `/api/auth/me` | — | ✅ JWT |
| PUT  | `/api/auth/profile` | `{ name, email, village, ... }` | ✅ JWT |

### Market
| Method | Endpoint | Query/Body | Auth |
|--------|----------|------------|------|
| GET | `/api/market/prices` | `?crop=wheat&mandi=pune` | — |
| GET | `/api/market/buyers` | `?crop=onion&verified=1` | — |
| GET | `/api/market/listings` | `?crop=wheat&min_price=20` | — |
| POST | `/api/market/listings` | `{ crop, quantity_kg, price_per_kg, quality?, location? }` | ✅ |
| PUT | `/api/market/listings/:id` | `{ status?, price_per_kg? }` | ✅ |
| DELETE | `/api/market/listings/:id` | — | ✅ |

### Dashboard
| Method | Endpoint | Notes | Auth |
|--------|----------|-------|------|
| GET | `/api/dashboard/overview` | Full dashboard data in one call | ✅ |
| GET | `/api/dashboard/weather` | Live weather for farmer's district | ✅ |
| GET | `/api/dashboard/health` | Crop health scans | ✅ |
| POST | `/api/dashboard/health` | `{ crop, health_pct, disease?, notes? }` | ✅ |
| GET | `/api/dashboard/alerts` | All alerts sorted by severity | ✅ |
| PATCH | `/api/dashboard/alerts/:id/read` | Mark alert as read | ✅ |
| GET | `/api/dashboard/earnings` | 6-month earnings data | ✅ |

### Tasks
| Method | Endpoint | Notes | Auth |
|--------|----------|-------|------|
| GET | `/api/tasks` | `?status=pending&priority=urgent` | ✅ |
| POST | `/api/tasks` | `{ title, description?, due_date?, priority?, field_name? }` | ✅ |
| PUT | `/api/tasks/:id` | Update any field | ✅ |
| PATCH | `/api/tasks/:id/toggle` | Toggle done ↔ pending | ✅ |
| DELETE | `/api/tasks/:id` | — | ✅ |

### Crops
| Method | Endpoint | Notes | Auth |
|--------|----------|-------|------|
| GET | `/api/crops` | List all crop keys | — |
| GET | `/api/crops/:crop` | Full data (wheat/rice/cotton/soybean/tomato) | — |
| GET | `/api/crops/:crop/pesticides` | Pesticide recommendations + disease info | — |
| GET | `/api/crops/:crop/fertilizers` | Fertilizer plan + weekly schedule | — |

### AI Chat
| Method | Endpoint | Body | Auth |
|--------|----------|------|------|
| POST | `/api/chat` | `{ messages: [{role, content}] }` | Optional |
| GET | `/api/chat/history` | List saved sessions | ✅ |
| GET | `/api/chat/history/:id` | Full session messages | ✅ |
| DELETE | `/api/chat/history/:id` | — | ✅ |

---

## 🗄 Database (SQLite)

Tables auto-created in `./db/krishiseva.db`:

- **farmers** — accounts with land, location, crop list
- **listings** — produce listings on the market
- **mandi_prices** — live APMC mandi rates per crop
- **tasks** — daily farm tasks with priority/status
- **alerts** — disease/weather/market notifications
- **crop_health** — AI scan results per crop per field
- **chat_sessions** — chat history per farmer
- **buyers** — verified buyer directory

---

## 🔒 Security Features

- Passwords hashed with `bcryptjs` (salt rounds: 10)
- JWT tokens (7-day expiry, HS256)
- Rate limiting: 200 req/15min general; 10 req/min for AI chat; 20 req/15min for auth
- CORS configured per environment
- API key kept server-side (never exposed to browser)
- SQL injection prevented by parameterised queries (better-sqlite3)

---

## 🌱 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `JWT_SECRET` | **Yes** | Long random string for JWT signing |
| `ANTHROPIC_API_KEY` | **Yes** | Your Anthropic API key for KrishiBot |
| `DB_PATH` | No | SQLite file path (default: `./db/krishiseva.db`) |
| `NODE_ENV` | No | `development` or `production` |

---

## 🚀 Production Deployment

```bash
# Set NODE_ENV
export NODE_ENV=production
export JWT_SECRET="your-64-char-random-secret-here"
export ANTHROPIC_API_KEY="sk-ant-..."

# Start
npm start

# Or with PM2
pm2 start server.js --name krishiseva
```

For HTTPS, put behind **Nginx** or **Caddy** reverse proxy.

---

Made with 💚 for Bharat's Farmers | Helpline: **1800-180-1551**
