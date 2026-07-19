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
