# Daymark — Daily Routine & Focus WebApp

A full-stack, responsive routine and focus tracking web application built with React + Vite, Node.js + Express, and PostgreSQL.

## Features
- **Daily Routine Schedule**: 7:00 AM – 9:00 PM structured block routine with real-time tracking
- **Live Focus Timer**: Interactive start / pause / resume / complete session timer with gentle audio chimes
- **Daily Habit Check-in**: Track completion percentages with interactive progress visualization
- **End-of-day Notes**: Capture daily learnings, ship logs, and planning notes
- **Weekly Analytics Report**: Consistency breakdown and weekly averages
- **PWA Ready**: Web app manifest, theme colors, mobile responsive layout, and installable as a native-like app
- **Dual Storage Persistence**:
  - Automatically saves to PostgreSQL whenever a database connection string is provided
  - Seamless offline / local browser storage fallback when operating without a database
- **Web Notifications & Audio Chimes**: Gentle audio chimes (Web Audio API) and browser notifications for routine alarms

---

## Quick Start (Development)

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start the dev servers:
   ```bash
   npm run dev
   ```
   - Client dev server: [http://localhost:5173](http://localhost:5173) (with automatic `/api` proxying)
   - Backend API: [http://localhost:4000](http://localhost:4000)

---

## Connecting Your Database

When you have your PostgreSQL connection URL, add it to `server/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://username:password@host:port/database_name
# PGSSL is automatically handled for remote cloud databases (Neon, Supabase, Railway, Render, AWS RDS)
```

The server automatically creates the required `routine_days` table on first connection.

---

## Production WebApp Deployment

### Option 1: Unified Single-Service Deployment (Render, Railway, Fly.io, Heroku, VPS)
Build the frontend and run the Express server to serve both the web UI and the API from a single container or service:

```bash
# Build frontend
npm run build

# Start production server
npm start
```
The server serves the web application and handles all `/api/*` endpoints on the environment's `PORT`.

### Option 2: Decoupled Deployment
- **Frontend (Vercel / Netlify / Cloudflare Pages)**: Deploy the `client` directory. Set environment variable `VITE_API_URL=https://your-backend-api.com`.
- **Backend (Render / Railway / Fly.io)**: Deploy the `server` directory. Set `DATABASE_URL` in the environment settings.
