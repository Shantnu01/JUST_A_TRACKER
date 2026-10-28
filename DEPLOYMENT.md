# 🚀 Production CI/CD & Deployment Guide

This repository is equipped with an automated **GitHub Actions CI/CD Pipeline** (`.github/workflows/ci-cd.yml`) that automatically tests, builds, and deploys every commit to production.

---

## 🏗️ 1. How the Pipeline Works

Whenever you push to the `main` branch or open a pull request:

```mermaid
flowchart LR
    A[git push origin main] --> B[GitHub Actions]
    subgraph CI["1. CI Stage"]
        B --> C[Setup Node 20 LTS]
        C --> D[npm run install:all]
        D --> E[npm test (Server + Client)]
        E --> F[Vite Production Build]
    end
    subgraph CD["2. CD Stage"]
        F --> G{Branch == main?}
        G -->|Yes| H[Trigger Deploy Hook]
        H --> I[Post-Deploy Health Check /api/health]
        G -->|No (PR)| J[PR Status Green ✅]
    end
```

1. **Continuous Integration (CI)**:
   - Sets up Node.js 20 LTS with npm dependency caching.
   - Installs all dependencies across root, server, and client (`npm run install:all`).
   - Runs server smoke tests (`node --test test/smoke.test.js`).
   - Compiles the Vite frontend into an optimized, minified bundle in `client/dist`.
   - Verifies that `client/dist/index.html` and static assets are valid.
2. **Continuous Deployment (CD)**:
   - When tests pass on `main`, it triggers a production deployment to your host (Render).
   - Runs an optional automated health check against `https://<your-app>.onrender.com/api/health`.

---

## ⚡ 2. Multi-Core CPU Clustering & High Availability

By default, Node.js runs on a single event loop thread, utilizing only 1 CPU core and leaving the rest idle.

To maximize throughput and ensure zero-downtime resilience, the server implements **Node.js Native Clustering (`node:cluster`)**:
* **Parallel Core Utilization**: Automatically detects available CPU cores (`os.availableParallelism()`) and spawns dedicated worker processes.
* **Kernel Round-Robin Load Balancing**: Incoming HTTP requests are distributed across all workers with zero performance overhead.
* **Self-Healing Process Supervisor**: If a worker crashes, the primary master process catches `cluster.on('exit')` and automatically spawns a fresh replacement worker with zero downtime.
* **Single Background Loop Guarantee**: Scheduled background push alarms only run on Worker #1 to prevent duplicate notifications.
* **Telemetry in Health Check**: Visit `/api/health` to inspect the serving `workerId`, `pid`, `coresAvailable`, and `memoryUsageMB`.

Configure via Environment Variables:
* `WEB_CONCURRENCY`: Explicit number of workers (e.g. `2` or `4`).
* `MAX_WORKERS`: Safety cap on worker count (default: `4` to protect free-tier RAM limits).
* `CLUSTER_MODE`: Set to `false` to disable clustering and run in single-core mode.

---

## 🏎️ 3. Upstash Redis Pod Acceleration & Reliability

To protect PostgreSQL connections from heartbeat thrashing and deliver sub-10ms response times, the app integrates **Upstash Redis**:
* **Live Ephemeral Presence**: Heartbeats update Redis with a 65s auto-expiring TTL (`presence:<userId>`). If a member closes their tab or browser, their presence cleanly expires, eliminating the stale "In Focus" offline bug.
* **Sub-10ms Leaderboard Caching**: Pod rankings are cached for 20s and immediately invalidated when any member marks a habit or logs focus time.
* **Atomic Nudge Cooldowns**: Enforces 5-minute spam prevention atomically (`SET NX EX 300`) with zero database load while returning exact remaining seconds for live button countdowns.

## ⚙️ 4. Production Host Setup (Render)

The project includes [`render.yaml`](./render.yaml) for a single-service fullstack deployment where Express serves both the REST API and the compiled Vite React frontend.

### Step 1: Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\to$ **Web Service** $\to$ Connect your GitHub repository `Shantnu01/JUST_A_TRACKER`.
3. Configure the settings (or use `render.yaml`):
   - **Root Directory**: `routine-dashboard` (if deploying from monorepo) or leave empty if the repo root is `routine-dashboard`.
   - **Environment**: `Node`
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

### Step 2: Configure Environment Variables in Render
In Render Web Service settings $\to$ **Environment**:
| Variable Name | Value Description |
|---|---|
| `NODE_VERSION` | `20` |
| `DATABASE_URL` | Your PostgreSQL connection string with `?sslmode=require` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (e.g. `https://funny-poodle-199709.upstash.io`) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token for high-throughput live presence and caching |
| `JWT_SECRET` | Secure 64-character random string for Study Pod auth |
| `CLIENT_ORIGIN` | `https://<your-service-name>.onrender.com` |
| `VAPID_PUBLIC_KEY` | *(Optional)* WebPush public key |
| `VAPID_PRIVATE_KEY` | *(Optional)* WebPush private key |
| `VAPID_EMAIL` | *(Optional)* `mailto:your-email@example.com` |

---

## 🔐 3. Setting Up GitHub Secrets for Automated Deployments

To allow GitHub Actions to trigger deployments and run automated health checks:

1. In your GitHub repository, navigate to **Settings** $\to$ **Secrets and variables** $\to$ **Actions**.
2. Click **New repository secret**:
   - **Name**: `RENDER_DEPLOY_HOOK_URL`
   - **Value**: Copy your Deploy Hook URL from Render (Web Service $\to$ Settings $\to$ Deploy Hook $\to$ Copy URL).
3. *(Optional)* Add a second secret for automated health checks:
   - **Name**: `PRODUCTION_URL`
   - **Value**: `https://your-service-name.onrender.com` (without trailing slash).

---

## 🛠️ 4. Local Testing & Verification

Before pushing changes, you can verify your build locally using the same command that GitHub Actions executes:

```bash
# Run server tests + client production build
npm test

# Run production server locally
npm start
# Server will listen on http://localhost:4000 and serve client/dist
```

---

## 🩺 5. Monitoring & Health Checks

Once deployed, you can verify the status of your app at any time:
- **Health Endpoint**: `https://<your-domain>/api/health`
  - Responds with: `{"status": "ok", "database": "connected"}`
- **GitHub Actions Status**: Check the **Actions** tab on GitHub to see live logs of every build and deployment.
