# Part 1 — Technical Review

**Project:** Forest BD Viewer
**Date:** April 21, 2026

---

## What's actually working well

Before getting into what needs fixing, it's worth naming what was already done right — because there's real craft here and it set a solid foundation.

**Auth is properly assembled.** JWT expiration is enforced, secrets come from environment variables, and passwords are hashed with bcrypt at cost 10. The login and register endpoints validate input with class-validator decorators backed by a global `ValidationPipe`. These are exactly the right primitives, wired together correctly. A lot of projects get this wrong; this one didn't.

**No SQL injection surface.** Every PostGIS query in `geospatial.service.ts` uses TypeORM's QueryBuilder with named parameters. `ST_MakeEnvelope` receives bound values through parameters, not string interpolation. The spatial query surface is clean.

**GraphQL schema design is clean.** Auth, user, and geospatial concerns live in separate resolvers and modules. The custom `GeoJSON` scalar is the right approach for transporting geometry. Input types are proper DTOs with validation decorators.

**TypeScript strict mode is on and mostly honored.** Both `apps/api/tsconfig.json` and `apps/web/tsconfig.json` have `strict: true`. The compiler is configured to catch errors at the right level.

**Turborepo is correctly wired.** `dependsOn: ["^build"]` ensures packages build before apps consume them, dev tasks run uncached, and build outputs are tracked. The monorepo orchestration works.

---

## What needs attention

### The data layer is completely public — fix this first

Every geospatial query — `regions`, `departements`, `communes`, `forestPlots` — has no authentication guard. Anyone who finds the GraphQL endpoint can query the entire forest plot dataset without logging in. There's no exploitation required; the door is simply open.

The fix is adding `@UseGuards(GqlAuthGuard)` to the four queries in `geospatial.resolver.ts`. The frontend already sends the `Authorization` header correctly through Apollo Client, so authenticated users won't notice any change.

### JWTs are in localStorage

`authStore.ts` writes the token to `localStorage` on login, and Apollo Client reads it from there on every request. Any JavaScript running on the page can read `localStorage` — including scripts from npm dependencies. A single XSS vulnerability, wherever it comes from, gives an attacker the token and full account access.

The right fix is `httpOnly` cookies: the browser sends them automatically on every request, and JavaScript cannot read them at all, regardless of any XSS in the page. This involves issuing a `Set-Cookie` header from the API instead of returning the token in the response body, and updating Apollo Client to use `credentials: 'include'` instead of the manual `Authorization` header.

### Database indexes are commented out

In `forest-plot.entity.ts`, these decorators are commented out:

```ts
// @Index(['code_region'])
// @Index(['code_departement'])
// @Index(['code_commune'])
```

There's also no spatial index on the geometry column. On a small local dataset this is invisible. On a real dataset, every filtered query becomes a full table scan. There's no soft degradation — past a certain size, the app stops being usable.

Uncommenting the indexes and adding a GiST index on the geometry column is a one-line change per index. It should happen before any real data load.

### No migrations means no safe deployment path

`app.module.ts` uses `synchronize: process.env.NODE_ENV === 'development'`, which means TypeORM auto-creates and alters tables at startup. There are no migration files anywhere in the repo.

This is fine for local development. It's not fine for any shared environment: a column rename in an entity will silently mutate a shared database without any review step, and there's no way to roll back or audit what changed. Disabling `synchronize` and generating a baseline migration with `typeorm migration:generate` is the right next move before the project has a second environment.

### Other security gaps worth knowing about

**Apollo cache isn't cleared on logout.** User data from the session — polygons, map state, profile — stays in memory until a hard page reload. On a shared machine, the next person to open the app before reloading sees the previous user's data.

**GraphQL introspection and the playground are always on.** In production this hands anyone who finds the endpoint a fully labeled map of every type, field, and mutation in the API. It's a one-line environment gate fix, but it should be coordinated with any tooling that depends on introspection before it's turned off.

**No rate limiting.** The login mutation is directly brute-forceable. There's no throttle guard, no IP-based limiting, nothing.

### Code quality: `@ts-ignore` is hiding real type errors

`strict: true` is on, but five `@ts-ignore` directives in the frontend suppress type errors in core flows:

- `LoginForm.tsx` — login result shape
- `RegisterForm.tsx` — register result shape
- `ForestMap.tsx` — polygon save and load results
- `page.tsx` — `ME_QUERY` result

These aren't edge cases. They're in the critical paths. Each one is a place where the compiler's protection is deliberately disabled. The underlying fix is generating TypeScript types from the GraphQL schema with `graphql-codegen` and then removing the suppressions against those generated types.

### Error handling is inconsistent

`auth.service.ts` throws `UnauthorizedException` and `ConflictException` correctly. `users.service.ts` throws `new Error('User not found')`. NestJS serializes that as a 500 with a stack trace in the GraphQL error response, instead of a clean structured error. Every `throw new Error(...)` in service files should be a proper NestJS exception class.

### No tests

`apps/api/test/app.e2e-spec.ts` has one smoke test that checks for "Hello World". There are no unit tests, no integration tests, no resolver tests, no validation boundary tests. The codebase can't be safely refactored without a test harness.

### No Docker, no CI

No `Dockerfile`, no `docker-compose.yml`, no CI configuration. There's no reproducible way to stand up the stack from scratch or run it in any environment beyond a local machine.

### CORS is hardcoded

`main.ts` hardcodes `'http://localhost:3000'` as the CORS origin. Deploying to any real domain requires a code change rather than an environment variable.

---

## The three things to fix first

**1. Protect the geospatial resolvers.** Four decorator additions. Everything else on this list is a risk; this one is an open door.

**2. Move tokens to httpOnly cookies.** localStorage token theft is the highest-impact frontend vulnerability. Every npm package that ships a latent XSS in the future is a potential account takeover. httpOnly cookies eliminate the whole class.

**3. Uncomment the database indexes and introduce migrations.** The indexes are a silent time bomb. Combined with the absence of migrations, there's no safe path to deploying with real data. Fix both together — enable indexes, generate a baseline migration, disable `synchronize`.

---

## What was intentionally left for later

**Rate limiting** — needs a threat model decision (per-IP vs. per-user, in-app vs. infrastructure layer). The wrong implementation may conflict with future infra choices. It belongs in a dedicated hardening sprint.

**Test coverage** — zero to meaningful coverage is a multi-week investment that requires architectural decisions first (which layer, what doubles, whether to use a test database). A few brittle tests to hit a number would be worse than none. The right move is a structured test strategy, then systematic coverage of auth and geospatial.

**`@ts-ignore` removal** — each suppression is hiding a real type contract question. The right fix requires understanding the actual data shape, not just removing the comment. This belongs after the GraphQL schema stabilizes and types are generated from it.

**GeoJSON scalar validation** — the scalar currently accepts any value. Adding structural validation requires defining what geometry types the app accepts and what the error contract looks like. Belongs in a broader input hardening pass.

**Introspection/playground gate** — a one-line fix, but it should be coordinated with any tooling that depends on introspection before it goes in.

**Docker / CI** — infrastructure decisions that depend on hosting target and team deployment process. Out of scope for a code review.

---

## Build issues that were fixed during this review

### Monorepo type leakage: `@types/mapbox-gl` breaking the API build

npm workspaces hoists everything to the root `node_modules/`. `@types/mapbox-gl` is a web app dev dependency, but because it lands in the root `@types/` folder, the API's TypeScript compiler picked it up automatically. TypeScript automatically includes all visible `@types/*` packages unless an explicit `types` array is declared. The API had no such array, so it inherited `@types/mapbox-gl` and `@types/mapbox__mapbox-gl-draw`, both frontend-only.

This blocked `nest start --watch` on a fresh checkout — the backend wouldn't compile at all, for what looked like an environment setup issue but was actually a TypeScript misconfiguration.

**Fixed by** adding a `types` array to `apps/api/tsconfig.json` and `packages/database/tsconfig.json`:

```json
// apps/api/tsconfig.json
"types": ["node", "jest"]

// packages/database/tsconfig.json
"types": ["node"]
```

### `packages/database` has no `dist/` on a fresh checkout

`@forest/database` is imported by the API, and its `package.json` points at `dist/index.js`. That folder isn't committed to git. Because `turbo dev` only runs `dev` tasks (not `build` for packages), running `npm run dev` fresh fails immediately with `TS2307: Cannot find module '@forest/database'` across every API source file.

The `packages/database` build was also blocked by the type hoisting issue above — both had to be fixed in order.

**Fixed by** documenting `npm run build --workspace=packages/database` as a required step after `npm install` in the getting started guide.

### PostGIS wasn't listed as a prerequisite

The app's entire data model depends on the PostGIS extension. `brew install postgresql` doesn't include it. When the API starts with `synchronize: true`, it tries to create a `geometry` column, which fails silently with a misleading `Unable to connect to the database. Retrying...` loop rather than a clear message pointing at the missing package.

**Fixed by** updating the README with PostGIS install instructions for macOS, Ubuntu/Debian, and Windows, plus a verification step and a Common Issues entry explaining the silent failure behavior.

---

## Summary

| Area | Finding | Severity | Status |
|---|---|---|---|
| Geospatial resolvers unprotected | No auth guard on any geospatial query | **Critical** | To fix — Priority 1 |
| JWT in localStorage | XSS-accessible token storage | **High** | To fix — Priority 2 |
| Database indexes disabled | Full table scans on all filtered queries | **High** | To fix — Priority 3 |
| No database migrations | `synchronize: true`, no schema history | **High** | To fix — Priority 3 |
| Monorepo type leakage | `@types/mapbox-gl` breaking API compilation | **High (build)** | **Fixed** |
| `packages/database` dist missing | API can't resolve `@forest/database` on fresh checkout | **High (build)** | **Fixed** |
| PostGIS not listed as prerequisite | Silent `geometry` type failure on startup | **High (setup)** | **Fixed** |
| `isLoading: true` initial state | Auth page stuck on spinner for all fresh sessions | **Critical (runtime)** | **Fixed** |
| Apollo cache not cleared on logout | Previous session data visible to next user | **Medium** | Not yet |
| Introspection/playground unconditional | Full schema exposed in production | **Medium** | Not yet |
| No rate limiting | Login endpoint brute-forceable | **Medium** | Not yet |
| `@ts-ignore` in core flows | Compiler blind spots in auth and map paths | **Medium** | Not yet |
| Generic `throw new Error()` | Stack trace leakage, inconsistent error shape | **Low–Medium** | Not yet |
| No tests | No regression safety net | **High (long-term)** | Not yet |
| No Docker / CI | No reproducible build or deployment | **Medium (ops)** | Not yet |
