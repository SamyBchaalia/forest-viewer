# Forest BD Viewer

An interactive geospatial application for exploring and analyzing French forest plot data. It combines Mapbox satellite imagery with WMS overlay layers (cadastral, administrative, forest metadata), a polygon drawing tool for spatial analysis, and per-user map state persistence.

**Stack:** Next.js 19 · NestJS · GraphQL · PostgreSQL + PostGIS · Mapbox GL · Turborepo

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20.x |
| npm | 10.x |
| PostgreSQL | 14.x |
| PostGIS | 3.x (must be installed separately — see below) |

---

## Repository Structure

```
forest-bd-viewer/
├── apps/
│   ├── api/        # NestJS GraphQL API (port 4000)
│   └── web/        # Next.js frontend (port 3000)
└── packages/
    └── database/   # Shared TypeORM entities
```

---

## 1. Database Setup

### Install PostGIS

PostGIS is a separate system package — it is not bundled with PostgreSQL. Install it before creating the database:

**macOS (Homebrew):**
```bash
brew install postgresql@17
brew install postgis
```
> PostGIS via Homebrew is built against PostgreSQL 17. Use `postgresql@17` to avoid version mismatch errors.

**Ubuntu / Debian:**
```bash
sudo apt install postgresql-16-postgis-3   # adjust version numbers to match your PostgreSQL
```

**Windows:** Use the Stack Builder wizard included with the PostgreSQL installer and select the PostGIS bundle.

> After installing, restart PostgreSQL if it was already running:
> `brew services restart postgresql` (macOS) or `sudo systemctl restart postgresql` (Linux)

### Create the database

```sql
CREATE DATABASE forest_bd_viewer;
\c forest_bd_viewer
CREATE EXTENSION IF NOT EXISTS postgis;
```

You can verify PostGIS is active with:
```sql
SELECT PostGIS_Version();
```

The API uses TypeORM with `synchronize: true` in development mode, so tables are created automatically on first startup. No migration step is required locally.

---

## 2. Environment Variables

Copy the example files and fill in the required values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### `apps/api/.env`

```env
PORT=4000
NODE_ENV=development

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=forest_bd_viewer

JWT_SECRET=a_long_random_secret_string
JWT_EXPIRATION=7d

MAPBOX_TOKEN=pk.your_mapbox_public_token
```

### `apps/web/.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token
```

> **Mapbox token:** Create a free account at [mapbox.com](https://www.mapbox.com/) and generate a public token. The same token goes in both `.env` files.

---

## 3. Install Dependencies and Build Shared Packages

From the repository root:

```bash
npm install
```

This installs dependencies for all workspaces (`apps/api`, `apps/web`, `packages/database`) in a single pass via npm workspaces.

Then build the shared database package — the API and web app import from it and will fail to compile if its `dist/` is missing:

```bash
npm run build --workspace=packages/database
```

---

## 4. Run in Development

Start both the API and the web app simultaneously with Turborepo:

```bash
npm run dev
```

Or run each app individually in separate terminals:

```bash
# Terminal 1 — API
cd apps/api
npm run dev          # NestJS watch mode, restarts on file changes

# Terminal 2 — Web
cd apps/web
npm run dev          # Next.js dev server with hot reload
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| GraphQL API | http://localhost:4000/graphql |
| GraphQL Playground | http://localhost:4000/graphql |

---

## 5. First-Time Login

The app requires an account. Register via the sign-up form at http://localhost:3000. There is no seed script — the first user you register becomes the initial account.

---

## 6. Build for Production

```bash
npm run build
```

This runs `turbo build`, which compiles `packages/database` first, then `apps/api` (outputs to `apps/api/dist/`) and `apps/web` (outputs to `apps/web/.next/`).

Start the production builds:

```bash
# API
cd apps/api && npm run start:prod

# Web
cd apps/web && npm start
```

Set `NODE_ENV=production` in both `.env` files before running in production.

---

## 7. Linting and Tests

```bash
# Lint all workspaces
npm run lint

# API tests (from apps/api)
cd apps/api
npm test              # unit tests
npm run test:e2e      # end-to-end tests
npm run test:cov      # coverage report
```

---

## Common Issues

**`type "geometry" does not exist`**
PostGIS is not installed on your PostgreSQL server. `CREATE EXTENSION IF NOT EXISTS postgis` silently does nothing when the PostGIS binaries are absent — it does not error. Run `brew install postgis` (macOS) or the equivalent for your OS, restart PostgreSQL, then try again.

**`relation "forest_plots" does not exist`**
The PostGIS extension was not enabled in the database. Connect to `forest_bd_viewer` and run `CREATE EXTENSION IF NOT EXISTS postgis;`, then restart the API.

**`Error: connect ECONNREFUSED 127.0.0.1:5432`**
PostgreSQL is not running. Start it with `brew services start postgresql` (macOS) or `sudo systemctl start postgresql` (Linux).

**Map tiles not loading / blank map**
The `NEXT_PUBLIC_MAPBOX_TOKEN` value is missing or invalid. Verify the token in `apps/web/.env` starts with `pk.`.

**`Cannot find module '@forest/database'`**
Run `npm install` from the repository root, not from inside an individual app directory. The workspace symlinks are set up at the root level.
