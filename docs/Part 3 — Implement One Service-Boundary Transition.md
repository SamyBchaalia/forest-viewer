# Part 3 — Service Boundary: Geospatial Queries

**Project:** Forest BD Viewer
**Date:** April 21, 2026

---

## What was done and why

The geospatial query domain — administrative area lookups (`regions`, `departements`, `communes`, `lieuxDits`) and viewport-bounded plot queries (`forestPlots`) — was extracted behind a service interface. The concrete implementation (TypeORM or HTTP) is now selected in one place, and no consumer of the geospatial data needs to know which one is active.

### Why this domain specifically

Three things made this the right place to draw a service boundary:

**It has a single data dependency.** Every query in `GeospatialService` touches only the `ForestPlot` entity. There's no user, no auth state, no polygon — nothing crosses into another domain. NestJS already organized this into its own module. The boundary was there conceptually; this change makes it explicit in code.

**Its performance profile is different from everything else.** The forest plot query is the most expensive operation in the app: PostGIS `ST_Intersects` across potentially 10,000 rows, returning GeoJSON geometries. Long-term, this wants different scaling, caching, and resource allocation than the auth and user flows that currently share the same NestJS process. Separating it at the service layer is the first step toward being able to scale or cache it independently.

**The API surface is small and stable.** Five methods: `getRegions`, `getDepartements`, `getCommunes`, `getLieuxDits`, `getForestPlots`. None of them need a session or cross-domain state. A clean contract exists naturally.

### The coupling problem this solves

Before this change, `GeospatialResolver` imported `GeospatialService` directly. If you wanted to swap the implementation — say, point it at a dedicated microservice instead of the local database — you'd have to change the resolver, the module, and any other consumer that happened to import the class. The concrete implementation was the contract.

After this change:

- `GeospatialResolver` depends on `IGeospatialService` (the abstract class)
- The concrete provider — `GeospatialService` or `GeospatialHttpClient` — is wired in the module
- No consumer touches or imports the implementation class

---

## What was built

### New file: `geospatial.service.interface.ts`

Defines `IGeospatialService` as an abstract class with one abstract method per query. It's an abstract class rather than a TypeScript interface because NestJS uses `emitDecoratorMetadata` to inject constructor parameters at runtime — TypeScript interfaces are erased at compile time and can't be reflected. An abstract class survives compilation and works with NestJS's DI.

```ts
export abstract class IGeospatialService {
    abstract getRegions(): Promise<string[]>;
    abstract getDepartements(regionCode: string): Promise<string[]>;
    abstract getCommunes(departementCode: string): Promise<string[]>;
    abstract getLieuxDits(communeCode: string): Promise<string[]>;
    abstract getForestPlots(filters: ForestPlotsFilterInput): Promise<unknown[]>;
}

export const GEOSPATIAL_SERVICE = Symbol('GEOSPATIAL_SERVICE');
```

### New file: `geospatial.http-client.ts`

`GeospatialHttpClient implements IGeospatialService` is a drop-in replacement that calls an external HTTP service instead of querying PostGIS directly. It reads `GEOSPATIAL_SERVICE_URL` from the environment and issues `fetch` calls to the paths a standalone service would expose. Errors are thrown as exceptions with the HTTP status, which NestJS propagates through the GraphQL layer the same way local errors do.

This class exists to make the switch cost near-zero when you're ready. You don't need to write or test it at migration time — it's already there.

### Modified: `geospatial.service.ts`

Added `implements IGeospatialService` to the class declaration. No logic changed. This just makes the contract explicit and compiler-verified — if a method signature drifts from the interface, TypeScript tells you.

### Modified: `geospatial.module.ts`

Registers both implementations as providers and selects between them at startup:

```ts
{
    provide: GEOSPATIAL_SERVICE,
    useFactory: (config, local, remote) =>
        config.get('GEOSPATIAL_SERVICE_URL') ? remote : local,
    inject: [ConfigService, GeospatialService, GeospatialHttpClient],
}
```

When `GEOSPATIAL_SERVICE_URL` is absent, behavior is identical to before this change. When it's set, `GeospatialHttpClient` activates automatically — no code change required.

### Modified: `geospatial.resolver.ts`

The constructor now injects `IGeospatialService` by symbol:

```ts
constructor(
    @Inject(GEOSPATIAL_SERVICE) private readonly geoService: IGeospatialService,
) {}
```

The resolver no longer imports the concrete class. It doesn't know and doesn't care which implementation is running.

---

## How to actually extract this into a standalone service

When you're ready to move geospatial queries out of the main app entirely, here's the three-step path:

**Step 1 — Stand up the standalone service.** Move `GeospatialService`, `GeospatialModule`, and the `ForestPlot` entity into a new app (`apps/geospatial-service`). Expose the five methods as HTTP endpoints matching the paths `GeospatialHttpClient` already calls (`GET /regions`, `GET /departements`, `POST /forest-plots`, etc.). The service gets its own database connection and PostGIS credentials.

**Step 2 — Flip the switch.** Set `GEOSPATIAL_SERVICE_URL=http://geospatial-service:3002` in the main app's environment. The module factory selects `GeospatialHttpClient`. Nothing else changes — not the resolver, not the frontend, not the GraphQL schema.

**Step 3 — Remove the TypeORM dependency from the main app.** Once the remote service is stable, drop `TypeOrmModule.forFeature([ForestPlot])` and `GeospatialService` from the main app's `GeospatialModule`. The main app no longer needs a PostGIS connection for geospatial queries.

None of these steps touch `GeospatialResolver`, `FilterPanel`, `ForestMap`, or anything on the frontend.

---

## What's still coupled, and why that's acceptable for now

| What | Why it's still coupled | What the real fix looks like |
|---|---|---|
| `ForestPlotsFilterInput` DTO | Carries NestJS `@InputType()` decorators used to generate the GraphQL schema — it can't be a plain interface | Move to a shared package alongside `ForestPlotType` |
| `ForestPlotType` GraphQL output | Schema generation requires the class to live inside a NestJS module | Same shared package move |
| Single database | `GeospatialService` reads the same `ForestPlot` table as the rest of the app | Acceptable now. Schema-level separation (dedicated schema or read replica) is the natural next step, done after the app layer is separated |

The boundary is at the application layer, not the data layer. That's intentional — separating the database is a larger operation with more risk, and doesn't need to happen at the same time as the service extraction.

---

## Changed files

- `apps/api/src/geospatial/geospatial.service.interface.ts` — new
- `apps/api/src/geospatial/geospatial.http-client.ts` — new
- `apps/api/src/geospatial/geospatial.service.ts` — `implements IGeospatialService` added
- `apps/api/src/geospatial/geospatial.module.ts` — factory provider, both implementations registered
- `apps/api/src/geospatial/geospatial.resolver.ts` — injects by symbol, no longer imports concrete class
