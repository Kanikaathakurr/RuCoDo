# 🏃 RuCoDo — NIT Hamirpur Ground Run

A gamified campus fitness web app for NIT Hamirpur students to track running laps around the college ground, compete on leaderboards, and build running streaks.

---

## 🌐 Live App
**Frontend:** https://kanikaathakurr.github.io/RuCoDo/

---

## 📱 Features

- **Lap Tracking** — Real GPS-based lap detection using the browser's Geolocation API
- **Live Map** — OpenStreetMap (via Leaflet.js) showing the actual NIT Hamirpur ground with your GPS trail drawn in real time
- **Strava-style Trail Replay** — After every run, your GPS route is replayed on the map
- **Daily Leaderboard** — Who ran the most laps today
- **All-Time Leaderboard** — Campus legends ranked by total laps ever
- **Personal Stats** — Total laps, km, best day, streak, run history, milestone progress
- **Anti-Cheat Validation** — Server-side GPS validation checks distance, speed, lap time, and ground boundary
- **JWT Authentication** — Secure login with roll number and password

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML / CSS / JavaScript | Core frontend — no framework |
| Leaflet.js | Interactive map with OpenStreetMap tiles |
| Geolocation API | Real GPS tracking |
| GitHub Pages | Free frontend hosting |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database |
| bcryptjs | Password hashing |
| JSON Web Tokens (JWT) | Authentication |
| Render.com | Free backend hosting |

---

## 📁 Project Structure

```
RuCoDo/
├── docs/                        ← Frontend (served by GitHub Pages)
│   ├── index.html               ← Single Page Application entry point
│   ├── css/
│   │   ├── base.css             ← Variables, reset, layout system
│   │   ├── components.css       ← All UI components
│   │   └── animations.css       ← Keyframes and motion
│   └── js/
│       ├── api.js               ← All fetch() calls to backend
│       ├── storage.js           ← Local cache layer
│       ├── data.js              ← Constants, milestones, formatters
│       ├── map.js               ← Leaflet map, GPS trail, replay
│       ├── run.js               ← Run state, GPS tracking, lap detection
│       ├── leaderboard.js       ← Daily and all-time boards
│       ├── stats.js             ← Personal stats page
│       └── app.js               ← Main controller, routing, auth
│
└── nith-run-backend/            ← Backend (hosted on Render)
    ├── server.js                ← Entry point
    ├── models/
    │   ├── User.js              ← User schema
    │   └── Run.js               ← Run schema with GPS trail
    ├── routes/
    │   ├── auth.js              ← Register, login, get current user
    │   ├── runs.js              ← Save run, history, GPS trail
    │   ├── leaderboard.js       ← Daily and all-time leaderboard APIs
    │   └── users.js             ← Profile and public stats
    ├── middleware/
    │   └── auth.js              ← JWT verification middleware
    └── utils/
        └── gpsValidator.js      ← Server-side anti-cheat validation
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js installed
- MongoDB Atlas account (free)

### Backend
```bash
cd nith-run-backend
npm install
cp .env.example .env
# Fill in your MONGODB_URI and JWT_SECRET in .env
npm run dev
# Server runs on http://localhost:5001
```

### Frontend
- Open `docs/index.html` with Live Server in VS Code
- Or open directly in browser at `http://127.0.0.1:5500`

> Make sure `docs/js/api.js` has `BASE_URL = 'http://localhost:5001/api'` for local development

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login, returns JWT token |
| GET | `/api/auth/me` | Get current user |

### Runs
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/runs` | Save a completed run with GPS trail |
| GET | `/api/runs/history` | Your run history (paginated) |
| GET | `/api/runs/:id/trail` | GPS trail for map replay |

### Leaderboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leaderboard/daily` | Today's top runners |
| GET | `/api/leaderboard/alltime` | All-time champions |
| GET | `/api/leaderboard/my-rank` | Your rank on both boards |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/profile` | Full profile + today's laps |
| GET | `/api/users/:roll/public` | Anyone's public profile |

---

## 🛡️ Anti-Cheat System

Every run is validated server-side before being saved:

1. **Minimum GPS points** — at least 10 GPS points required
2. **Distance match** — GPS trace distance must match claimed laps (±25%)
3. **Minimum lap time** — no lap faster than 60 seconds
4. **Speed check** — no point-to-point speed above 25 km/h
5. **Boundary check** — 80%+ of GPS points must be inside the NIT Hamirpur ground polygon

Invalid runs are flagged and excluded from leaderboards.

---

## 🗺️ Ground Coordinates

The NIT Hamirpur ground boundary is defined by 18 GPS coordinates in `nith-run-backend/utils/gpsValidator.js`. These were traced manually using Google Maps for accurate lap detection.

---

## 👩‍💻 Developer

**Kanika Thakur**
NIT Hamirpur · ECE · 3rd Year

---

## 📄 License

This project is open source and free to use for NIT Hamirpur students.