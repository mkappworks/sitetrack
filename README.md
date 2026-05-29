# SiteTrack

Construction project tracker built to learn NestJS, GraphQL, Next.js, Kubernetes, and CI/CD.

## Stack

| Layer          | Technology                                                                |
| -------------- | ------------------------------------------------------------------------- |
| Backend        | NestJS + TypeORM + PostgreSQL                                             |
| API            | GraphQL (code-first) + WebSocket subscriptions                            |
| Auth           | Short-lived JWT access + rotating refresh tokens (Passport + NextAuth.js) |
| Frontend       | Next.js 16 App Router + TanStack Query + Tailwind CSS                     |
| Infrastructure | Docker + Kubernetes (minikube)                                            |
| CI/CD          | GitHub Actions → GHCR → K8s                                               |

## Quick start (local dev)

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Start everything
docker compose up --build

# 3. Open the app
open http://localhost:3000

# 4. Create an admin user via GraphQL Sandbox
open http://localhost:3001/graphql
```

## Step-by-step guide

See [GUIDE.md](./GUIDE.md) for a complete walkthrough of every phase, including explanations of every architectural decision.

## Project structure

```
backend/    NestJS API (GraphQL, TypeORM, JWT)
frontend/   Next.js App Router (Server Components, Server Actions)
k8s/        Kubernetes manifests
.github/    GitHub Actions CI/CD pipeline
```

## Authentication and authorization — the full JWT lifecycle

Two distinct JWTs exist in the system, created and validated at different layers.

### The two JWTs

| Token                    | Created by                                                                      | Stored where                                                               | Validated by                                                                    | Carries                                                                           |
| ------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Backend access token** | NestJS `AuthService.generateAccessToken()` (`backend/src/auth/auth.service.ts`) | Only inside NextAuth's session cookie (server-side); never persisted in DB | NestJS `JwtStrategy.validate()` (`backend/src/auth/strategies/jwt.strategy.ts`) | `{ sub: userId, email, role, sid }`, signed with `JWT_SECRET`, 15-min expiry      |
| **NextAuth session JWT** | NextAuth itself (`session: { strategy: 'jwt' }` in `frontend/lib/auth.ts`)      | Encrypted **HttpOnly cookie** in the browser (`next-auth.session-token`)   | NextAuth on every request via `withAuth` middleware (`frontend/middleware.ts`)  | The backend access + refresh tokens + role + id, encrypted with `NEXTAUTH_SECRET` |

(The opaque refresh token is a third credential — not a JWT — stored hashed in the `refresh_tokens` table and rotated on each use; see below.)

### Step-by-step flow

**Login (POST → backend → cookie):**

1. User submits credentials at `/login` → calls `signIn('credentials', ...)`.
2. NextAuth invokes the `authorize` callback in `frontend/lib/auth.ts`.
3. `authorize` calls `gqlFetch(LOGIN_MUTATION, ...)` — a regular GraphQL mutation against the backend.
4. **Backend mints two credentials** in `AuthService.login()`: a short-lived access JWT (`JWT_EXPIRES_IN=15m`, signed with `JWT_SECRET`) and an opaque 256-bit refresh token. Only the refresh token's sha256 hash is stored (`refresh_tokens` table); the access token is never persisted.
5. Backend returns `{ accessToken, refreshToken, accessTokenExpiresAt, user }`.
6. NextAuth's `jwt` callback stores all of these in **its own** JWT.
7. NextAuth encrypts that JWT with `NEXTAUTH_SECRET` (JWE — not just JWS) and sets it as an HttpOnly cookie. The cookie is never exposed to client JS.

**Subsequent requests (server-side):**

1. A Server Component or Server Action runs (e.g. `frontend/lib/actions/project.actions.ts` or `gqlClient()` in `frontend/lib/graphql/client.ts`).
2. It calls `getServerSession(authOptions)` — NextAuth reads the cookie, decrypts it, runs the `session` callback which surfaces `accessToken` on the session object.
3. `gqlClient` attaches `Authorization: Bearer <accessToken>` to the outgoing GraphQL request.
4. Backend receives the request. The resolver method has `@UseGuards(JwtAuthGuard)`.
5. `JwtAuthGuard` extends `AuthGuard('jwt')`, which triggers Passport's `JwtStrategy`.
6. `JwtStrategy` extracts the bearer token, **verifies the signature with `JWT_SECRET`**, then calls `validate(payload)`.
7. `validate` looks up the user from DB and returns it — Passport attaches it to `req.user`.
8. If `@Roles(...)` is also present, `RolesGuard` runs next and checks `req.user.role` against the metadata.
9. The resolver method runs; `@CurrentUser()` can pull the user out.

**Route protection (page-level):**

- `frontend/middleware.ts` wraps protected paths with `withAuth`, which validates the NextAuth cookie before the page renders. No backend call is needed for the page guard — that's a separate check from the GraphQL authz.

### Key questions answered

- **Where is the JWT created?** The backend `AuthService.generateAccessToken()` creates the access JWT, signed with `JWT_SECRET`, on login and on each refresh. NextAuth then creates a _second_, encrypted JWT that wraps the credentials for cookie storage — but NextAuth never creates the access token itself.
- **Where is the JWT validated?** Two checks, both per-request:
  1. **NextAuth middleware** validates the _session cookie_ on protected page navigations.
  2. **NestJS `JwtStrategy`** validates the _backend access token_ on every GraphQL request that hits a `@UseGuards(JwtAuthGuard)` resolver.
- **Is it saved?** The access token is not — it lives only inside the encrypted NextAuth cookie, and the backend is stateless about it (trusts the signature). The **refresh token is** — its sha256 hash is stored in `refresh_tokens`, which is what makes revocation possible. A leaked access token is valid for at most 15 minutes; a refresh token can be revoked instantly via a DB write.

## Refresh-token rotation, sessions, and audit

The access token is deliberately short-lived (15 min) so a leak is low-impact. Continuity comes from a rotating refresh token (30-day default):

- **Rotation.** Every use of a refresh token issues a new one and revokes the old (`RefreshTokenService.rotate`). The chain shares a `familyId`.
- **Reuse-detection.** Presenting an already-rotated (revoked) token is the theft signal — the entire family is revoked and the user must log in again (`backend/src/auth/refresh-token.service.ts`, locked in by `refresh-token.service.spec.ts`).
- **Proactive refresh.** NextAuth's `jwt` callback refreshes ~60s before access-token expiry; a client-side fallback in `gqlFetch` retries once after a 401 with a freshly-rotated token.
- **Active sessions.** One live token per family = one device. Users see and revoke their own devices at `/settings`; admins manage any user's sessions at `/admin/users/[id]`.
- **Audit log.** Destructive actions (delete/restore/purge) and auth events (login/logout/refresh-reuse) are recorded in `audit_log`, viewable by admins at `/admin/audit`. Destructive ops write their audit row in the same transaction as the data change.

Rate limiting (`@nestjs/throttler`): login 5/15min, refresh 30/5min per IP. GraphQL queries are depth-limited (8) against nesting-based DoS.

### Design notes

- `JwtStrategy.validate` does a **DB lookup per request** — it does not trust the role embedded in the JWT, it re-reads the fresh user. This protects against stale role data (e.g. admin demoted to viewer but token still says ADMIN). The trade-off is one extra query per authenticated call; the win is "role changes apply on the next request."
- `RolesGuard` short-circuits with `ADMIN` always passing — so there is no need to write `@Roles(ADMIN, MANAGER)` when "at least manager" is the intent.
- Passport `Strategy` classes are _self-registering_ — extending `PassportStrategy(Strategy)` registers under the default name `'jwt'`, which is why `AuthGuard('jwt')` finds it without explicit wiring.
- `JwtAuthGuard` overrides `getRequest()` because Passport's default `AuthGuard('jwt')` was written for REST and looks at `context.switchToHttp().getRequest()`. In GraphQL the request lives on `context.req`; the override threads it through correctly.

## Adding a new domain with the Nest CLI

`nest g resource` is the closest one-shot generator. In this codebase's TypeORM + GraphQL code-first setup it gets you roughly 70% of the way — the remaining edits are manual because the CLI does not know about the auth guards, DataLoader pattern, or dual `@Entity() + @ObjectType()` convention.

### The one-shot command

```bash
npx nest g resource equipment
```

The CLI prompts twice:

1. **Transport layer** → pick **GraphQL (code first)**.
2. **Generate CRUD entry points?** → `y`.

What you get in `backend/src/equipment/`:

- `equipment.module.ts` (auto-imported into `AppModule`)
- `equipment.service.ts` — stub methods
- `equipment.resolver.ts` — `@Query`/`@Mutation` already wired for `findAll/findOne/create/update/remove`
- `entities/equipment.entity.ts` — class with `@ObjectType()` (but **no** `@Entity()`)
- `dto/create-equipment.input.ts` and `dto/update-equipment.input.ts` (the update one uses `PartialType`)
- A `*.service.spec.ts` test stub

### Additional things to do after generation

The CLI does **not** know about this project's conventions. After running the generator, hand-edit:

| Missing piece                                                                | Manual fix                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| TypeORM `@Entity()`, `@Column()`, relations on the entity                    | Add them — model after `backend/src/materials/entities/material.entity.ts`                   |
| `TypeOrmModule.forFeature([Equipment])` in the module                        | Add to `imports`                                                                             |
| `@InjectRepository(Equipment)` in the service                                | Replace the stub in-memory storage with TypeORM repository calls                             |
| class-validator decorators (`@IsString`, `@IsEnum`, etc.) on DTOs            | Add manually — see `backend/src/projects/dto/project.input.ts`                               |
| `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(...)` on resolver methods | Add manually                                                                                 |
| DataLoader for list relations                                                | Hand-write — see `backend/src/projects/loaders/material.loader.ts`                           |
| Repository file                                                              | **Not needed in this codebase** — services inject TypeORM's generic `Repository<T>` directly |

### Recommended order of edits

1. Open the generated **entity** — add `@Entity('equipment')`, `@PrimaryGeneratedColumn('uuid')`, columns, relations, and TypeORM imports.
2. Open the generated **module** — add `imports: [TypeOrmModule.forFeature([Equipment])]`.
3. Open the generated **service** — inject the repository (`@InjectRepository(Equipment) private readonly repo: Repository<Equipment>`) and replace the stub bodies.
4. Open the generated **DTOs** — add class-validator decorators.
5. Open the generated **resolver** — add `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(...)` where appropriate, and `@CurrentUser()` if the service needs the caller.

### Piecemeal generators

If finer control is preferred over the all-in-one:

```bash
npx nest g module    equipment
npx nest g service   equipment --no-spec
npx nest g resolver  equipment --no-spec
npx nest g class     equipment/entities/equipment.entity --no-spec
npx nest g class     equipment/dto/equipment.input        --no-spec
```

Each command updates the relevant `imports`/`providers` arrays automatically. `--no-spec` skips the test stub.

## Schema changes — when to use migrations vs. `synchronize`

`backend/src/app.module.ts` enables `synchronize: true` only when `NODE_ENV=development`. In that mode TypeORM auto-applies entity-decorator changes (new tables, columns, indexes) to the live DB at app startup. In production `synchronize` is off and the only path is migrations.

The npm scripts already live in `backend/package.json`:

```bash
npm run migration:generate --name=AddEquipmentIndexes
npm run migration:run
```

| Environment  | How indexes (and other schema changes) get created                                              |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Local dev    | Add `@Index()` (or other decorator), restart `npm run dev` — `synchronize` creates it           |
| Staging/prod | Add `@Index()`, run `npm run migration:generate`, commit the migration, deploy, `migration:run` |

`synchronize` is a productivity shortcut, not a safety net — it can DROP a column on rename, losing data. For anything risky (renames, type changes, large tables), generate a migration locally too, read the SQL, and hand-edit before committing.

## Seeding development data

`npm run seed` (in `backend/`) populates the database with realistic demo data — ~30 users, ~30 projects, ~30 equipment items, and ~120 materials linked across them. The script is idempotent: it skips if more than 5 users already exist, so re-running is safe.

```bash
docker compose up -d postgres
cd backend && npm run seed
```

Seed logins (development only — passwords are hardcoded):

| Role    | Email                    | Password              |
| ------- | ------------------------ | --------------------- |
| Admin   | `admin@sitetrack.com`    | `SEED_ADMIN_PASSWORD` |
| Manager | `manager1@sitetrack.com` | `password123`         |
| Viewer  | `viewer1@sitetrack.com`  | `password123`         |

Manager and viewer accounts go up to `manager5` / `viewer24`. For a clean re-seed, truncate the tables manually:

```bash
docker exec sitetrack-postgres-1 psql -U sitetrack -d sitetrack \
  -c "TRUNCATE materials, equipments, projects, users RESTART IDENTITY CASCADE"
```

## Testing

Two suites, two purposes:

| Command            | Scope                                                         | Requires                                                           |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `npm test`         | Unit tests — mocked TypeORM repositories, no DB               | Nothing                                                            |
| `npm run test:e2e` | End-to-end — real Postgres, real transactions, real rollbacks | Docker-compose Postgres up; creates a separate `sitetrack_test` DB |

The unit suite proves service-level contracts in isolation. The e2e suite proves **DB-engine-level guarantees** that a mock can't — for example `backend/test/projects.transaction.e2e-spec.ts` calls `ProjectsService.createWithMaterials` with a `varchar(255)` overflow on the child material, expects the call to reject, then queries Postgres directly to confirm zero project rows survive. That's the only way to prove `ROLLBACK` actually fired at the engine.

```bash
# Start the database first
docker compose up -d postgres

# Unit tests — fast, no DB
cd backend && npm test

# E2E — uses sitetrack_test DB (auto-created), dev data is untouched
cd backend && npm run test:e2e
```
