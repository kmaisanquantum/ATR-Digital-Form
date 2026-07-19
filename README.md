# Air Task Request (ATR) Digital Form — PNGDF

A modular, production-ready, full-stack monorepo refactored from a monolithic vanilla JS/CSS application for submitting Air Task Requests (ATR) for the Papua New Guinea Defence Force (PNGDF).

## Architecture & Features

This project utilizes a modern full-stack decoupled architecture:

- **Decoupled Vanilla JS Frontend**: Scaffolding managed by **Vite** for optimized, high-performance static rendering. Features:
  - 8-stage step wizard navigation matching original monolithic design cards (`goToStep()`, `nextStep()`, `prevStep()`).
  - Dynamic interactive HTML5 Canvas signature capture pads (`SigPad` class) with DPR resize scaling.
  - Interactive table generator for up to 30 passengers (`buildPaxTable()`).
  - Custom Service Worker caching (`sw.js`) and PWA manifest (`manifest.json`) supporting fully **offline-first capability**.
  - Local **IndexedDB-backed submission queue** that caches offline requests and auto-synchronizes once internet connectivity is detected.
- **Robust Node.js Express Backend API**: Secure REST endpoints supporting:
  - Multi-stakeholder role-based authentication matching the official PNGDF chain of command (`Requesting Unit`, `AMS`, `SO3 Air Prep`, `D Air`, `COMD`, `ADS`).
  - Strict input validation, secure password hashing with **bcryptjs**, and secure session validation using **JSON Web Tokens (JWT)**.
  - Fully backward-compatible REST controllers that map signature relations to a dedicated `Signature` model, while also keeping form payloads consistent.
- **Relational PostgreSQL Database**: Managed via **Prisma ORM** for reliable transaction logs and fast relational queries.

---

## Folder Directory Structure

```text
ATR-Digital-Form/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── atrController.js
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── atrRoutes.js
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js
│   ├── src/
│   │   ├── js/
│   │   │   ├── auth.js
│   │   │   ├── formLogic.js
│   │   │   ├── sigPad.js
│   │   │   └── api.js
│   │   ├── styles.css
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Development & Setup

### Requirements
- **Node.js** v18+
- **Docker** & **Docker Compose**
- **PostgreSQL** database (optional if running via Docker Compose)

### 1. Environment Configurations
Rename `.env.example` in root folder to `.env` and fill the variables:
```bash
cp .env.example .env
```

### 2. Install Dependencies
Install dependencies for all workspaces at the root:
```bash
npm run install:all
```

### 3. Launch with Docker Compose
Spin up the PostgreSQL database, Express API server, and Vite dev server under a unified compose network:
```bash
docker-compose up --build
```
This serves the application on:
- Frontend Client: `http://localhost:3000`
- Backend REST API: `http://localhost:5000`

### 4. Database Setup & Prisma Migrations
Generate Prisma Client and run migrations on the database instance:
```bash
cd backend
npx prisma migrate dev
```

---

## Offline Synchronization Queue Flow

1. When the client selects **"Submit ATR"** under `Step 8`, the client checks `navigator.onLine`.
2. If **online**, the data is pushed directly to the Express server API `/api/atrs`.
3. If **offline** (or if a connection failure is caught), the form payload is captured, stored as a record in **IndexedDB** (`sync_queue`), and a friendly offline notice is shown.
4. When connectivity is restored (the window hears the `online` event listener), the client auto-retrieves all queued items from IndexedDB and synchronizes them background-transparently.

---

## Coolify Deployment Guide

This project is fully structured to be deployed seamlessly as a modern multi-service stack on **Coolify**.

### Dual-Route Deployment Strategies

Deployment engineers can choose between two robust deployment options depending on resource requirements:

#### Option A: Unified Application Stack (Recommended)
Point Coolify directly to the unified `docker-compose.prod.yml` configuration matrix located at the root of the repository.

1. Create a new **Docker Compose** application in Coolify.
2. Link your Git Repository and select the `main` branch.
3. Configure the config file path to point to `docker-compose.prod.yml`.
4. Define your environment variables in Coolify if necessary (though standard production defaults are configured).
5. Deploy. Coolify will dynamically orchestrate the PostgreSQL DB, the Express backend API (port 5000), and the multi-stage Nginx-served Vite frontend (port 3000), linking them seamlessly.

#### Option B: Isolated Services Route
Alternatively, provision two distinct service applications on Coolify to scale them independently.

##### 1. Backend Service
- **Application Type**: Private App or Dockerfile App.
- **Base Directory**: `backend`
- **Build Pack**: `dockerfile`
- **Build Command**: Leave empty or let Coolify auto-detect.
- **Start Command**: `sh -c "npx prisma migrate deploy || npx prisma db push && node src/index.js"` (Do NOT leave this blank. You must explicitly override the start command with this non-empty migration synchronization command sequence).
- **Exposed Port**: `5000`
- **Environment Variables**:
  - `DATABASE_URL`: Connection string to your production database.
  - `JWT_SECRET`: Safe JWT key.
  - `PORT`: `5000`

##### 2. Frontend Service
- **Application Type**: Static/Nginx or Dockerfile App.
- **Base Directory**: `frontend`
- **Build Pack**: `dockerfile`
- **Build Command**: Let Coolify build using the multi-stage `frontend/Dockerfile`.
- **Start Command**: `nginx -g "daemon off;"` (Do NOT leave this blank. Overriding the default empty Start Command is necessary to avoid continuous container restart loop rejections in Coolify).
- **Exposed Port**: `80` (mapped to external HTTP traffic).
- **Environment Variables**:
  - `VITE_API_BASE`: Set to the fully qualified domain or URL of your deployed backend service (e.g. `https://api.yourdomain.com`).

---

### Production Architectural Recommendation (Static Serving)

Serving Vite frontend applications via the `vite preview` server in production is not recommended for high-performance pipelines.

**Recommendation:** Serve the raw compiled static output files (`dist/`) directly using a dedicated, high-performance web server container layer (e.g., `nginx:alpine` or a lightweight static provider) as defined in our multi-stage `frontend/Dockerfile` and `docker-compose.prod.yml`.

This represents a cleaner and more secure production deployment strategy because:
1. It eliminates Node.js runtime overhead and memory footprints.
2. It entirely bypasses Node-based host-checking dependencies, avoiding any `"Blocked request. This host (domain) is not allowed."` errors.
3. Static files are served with optimized gzip/brotli compression, cache-control headers, and high concurrency natively provided by Nginx.

---

### ⚠️ CRITICAL WARNING FOR COOLIFY ENGINEERS

> **Never leave the "Start Command" empty in the Coolify configuration forms!**
>
> Coolify deployments will enter an infinite crash/restart loop with the error `/bin/bash: -c: option requires an argument` if the start command is left blank or empty. You must explicitly override the default empty form fields with the non-empty start commands documented above (`nginx -g "daemon off;"` for frontend, and the migration sequence + `node src/index.js` for backend).
