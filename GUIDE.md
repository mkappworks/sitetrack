# SiteTrack — Step-by-Step Build Guide

> A complete construction project tracker built with NestJS, GraphQL, Next.js, PostgreSQL, Docker, Kubernetes, and GitHub Actions.
> This guide walks you through every step from a blank directory to a running cluster deployment.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Project structure overview](#2-project-structure-overview)
3. [Phase 1 — NestJS backend from scratch](#3-phase-1--nestjs-backend-from-scratch)
4. [Phase 2 — GraphQL layer](#4-phase-2--graphql-layer)
5. [Phase 3 — Next.js frontend](#5-phase-3--nextjs-frontend)
6. [Phase 4 — Running locally with Docker Compose](#6-phase-4--running-locally-with-docker-compose)
7. [Phase 5 — Kubernetes deployment](#7-phase-5--kubernetes-deployment)
8. [Phase 6 — GitHub Actions CI/CD](#8-phase-6--github-actions-cicd)
9. [Key concepts reference](#9-key-concepts-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Install these before starting:

```bash
# Node.js 20+
node --version   # must be v20+

# Docker Desktop
docker --version
docker compose version

# minikube (for local Kubernetes)
brew install minikube    # macOS
# or: https://minikube.sigs.k8s.io/docs/start/

# kubectl
brew install kubectl

# NestJS CLI
npm install -g @nestjs/cli

# Verify all installed
nest --version && minikube version && kubectl version --client
```

---

## 2. Project structure overview

```
sitetrack/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/               # JWT auth, Guards, Decorators
│   │   ├── users/              # User entity + CRUD
│   │   ├── projects/           # Project entity + DataLoader
│   │   ├── materials/          # Material entity
│   │   ├── health/             # K8s health probes
│   │   └── database/           # TypeORM migrations datasource
│   └── Dockerfile
├── frontend/                   # Next.js App Router
│   ├── app/                    # Pages (Server Components)
│   ├── components/             # UI + Client Components
│   ├── lib/
│   │   ├── graphql/            # GQL client + queries
│   │   ├── actions/            # Server Actions
│   │   └── auth.ts             # NextAuth config
│   └── Dockerfile
├── k8s/                        # Kubernetes manifests
│   ├── postgres/               # StatefulSet + PVC + Service
│   ├── backend/                # Deployment + Service + ConfigMap
│   ├── frontend/               # Deployment + Service
│   ├── migration-job.yaml      # One-time DB migration Job
│   └── ingress.yaml
├── .github/workflows/
│   └── ci.yml                  # Lint → Test → Build → Deploy
└── docker-compose.yml          # Local dev stack
```

---

## 3. Phase 1 — NestJS backend from scratch

### Step 1.1 — Bootstrap the NestJS project

```bash
cd sitetrack
nest new backend --package-manager npm --skip-git
cd backend

# Install all dependencies (see package.json in the repo)
npm install \
  @nestjs/graphql @nestjs/apollo @apollo/server graphql \
  @nestjs/typeorm typeorm pg \
  @nestjs/jwt @nestjs/passport passport passport-jwt \
  @nestjs/config @nestjs/terminus \
  class-validator class-transformer \
  bcryptjs dataloader graphql-subscriptions graphql-ws \
  joi pino pino-http uuid

npm install -D \
  @types/bcryptjs @types/passport-jwt @types/uuid \
  typeorm-ts-node-commonjs ts-node
```

**About `tsconfig.json` vs `tsconfig.build.json`:** `nest new` scaffolds both files. The base `tsconfig.json` is what your editor and `jest` (via `ts-jest`) read — it includes ALL `.ts` files in `src/`, including `*.spec.ts`. The `tsconfig.build.json` extends the base and adds `"exclude": ["**/*.spec.ts", "test"]` — and `nest build` picks it up by default. Without `tsconfig.build.json`, your production `dist/` would include compiled test files AND the build would fail because the Jest global isn't available in a `nest build` compile (it doesn't auto-load `@types/jest`). If you ever see "Cannot find name 'jest'" during `npm run build`, this file is missing or misconfigured — its presence is what cleanly separates the test world from the production world.

### Step 1.2 — Understand NestJS module anatomy

Every feature in NestJS is a **module**. Open `src/users/users.module.ts` and observe:

```
Module         = the boundary (what goes in, what comes out)
  Provider     = a class NestJS can instantiate and inject (Services, Guards, Strategies)
  Controller   = HTTP handler (we use Resolvers instead, for GraphQL)
  Export       = what other modules can inject
  Import       = what this module needs from other modules
```

**Exercise:** Before reading the code, draw this on paper:

- What does `UsersModule` export? → `UsersService`
- What imports `UsersService`? → `AuthModule`
- Why? → `JwtStrategy.validate()` needs to look up the user from the JWT payload

### Step 1.3 — Set up environment validation

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `src/app.module.ts` and find the `ConfigModule.forRoot()` block. Notice the `validationSchema` using Joi. This runs at startup — if `JWT_SECRET` is missing or `DB_HOST` is not set, the app **refuses to start**. This is intentional. Silent misconfiguration is worse than a loud startup failure.

**Test it:** Remove `DB_HOST` from `.env` and run `npm run start:dev`. Observe the validation error. Restore it.

### Step 1.4 — Understand TypeORM entity design

Open `src/users/entities/user.entity.ts`. Note two sets of decorators on the same class:

```typescript
@ObjectType()   // ← GraphQL: makes this a type in the schema
@Entity('users') // ← TypeORM: maps this to the `users` table
export class User { ... }
```

This is the code-first approach: **one source of truth**. The same class defines both the database schema and the GraphQL schema. No separate schema file, no duplication.

**Key field:** `passwordHash` has `@Column()` but NO `@Field()`. This means TypeORM stores it, but GraphQL never exposes it. The password hash cannot be returned by any query. This is intentional.

### Step 1.5 — Run the backend for the first time

Start PostgreSQL:

```bash
docker run -d \
  --name sitetrack-postgres \
  -e POSTGRES_DB=sitetrack \
  -e POSTGRES_USER=sitetrack \
  -e POSTGRES_PASSWORD=sitetrack_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

Start the backend (with `synchronize: true` in dev, TypeORM auto-creates tables):

```bash
npm run start:dev
```

Visit **http://localhost:3001/graphql** — you should see the Apollo Sandbox.

### Step 1.6 — Test the auth flow in GraphQL Sandbox

Try registering a user:

```graphql
mutation {
  register(
    input: {
      email: "admin@sitetrack.com"
      name: "Admin User"
      password: "password123"
      role: ADMIN
    }
  ) {
    accessToken
    user {
      id
      name
      email
      role
    }
  }
}
```

Copy the `accessToken`. Click "Headers" in Apollo Sandbox and add:

```json
{ "Authorization": "Bearer YOUR_TOKEN_HERE" }
```

Now test the `me` query — it should return the authenticated user.

### Step 1.7 — Understand Guards

Open `src/auth/guards/jwt-auth.guard.ts`. It extends `AuthGuard('jwt')` but overrides `getRequest()`. This is critical — GraphQL doesn't use `req` directly, it uses the GraphQL context. Without this override, Passport can't find the JWT because it's looking in the wrong place.

Open `src/auth/guards/roles.guard.ts`. Note how it:

1. Reads the `@Roles()` decorator metadata via `Reflector`
2. Extracts the user from the GQL context (not from `req.user` directly)
3. Checks `ADMIN` first — admins bypass all role restrictions

**Exercise:** Try calling `users` query without the ADMIN role. Observe the `Forbidden resource` error. This is `RolesGuard` working.

### Step 1.8 — Write and run the first unit test

Open `src/projects/projects.service.spec.ts`. The test structure:

```
describe('ProjectsService', () => {
  beforeEach(() => {
    // Create a fresh testing module with mocked dependencies
    // This is the key: we never hit a real database in unit tests
  })

  describe('findOne', () => {
    it('returns project when found', ...)
    it('throws NotFoundException when missing', ...)
  })
})
```

Run:

```bash
npm run test
npm run test:cov  # generates coverage report
```

The `getRepositoryToken(Project)` trick replaces the real TypeORM repository with a plain Jest mock object. Every call to `projectsRepo.findOne()` is intercepted and returns whatever `mockResolvedValue` specifies. No database, no network, fast.

---

## 4. Phase 2 — GraphQL layer

### Step 2.1 — Understand code-first vs schema-first

**Schema-first:** You write a `.graphql` file by hand, then generate TypeScript types from it.
**Code-first (what we use):** You write TypeScript decorators, NestJS generates the `.graphql` schema file.

Open `src/schema.gql` (generated after first run). You did not write this file — it was generated from the decorators in your entity classes and resolvers. Any time you add a `@Field()` or a new `@Query()`, the schema file updates automatically.

### Step 2.2 — Understand the DataLoader pattern

Open `src/projects/loaders/material.loader.ts`. This is the solution to the N+1 problem.

Without DataLoader — what happens when you query 20 projects and each resolves its materials:

```
SELECT * FROM projects                        -- 1 query
SELECT * FROM materials WHERE project_id = 1  -- query 2
SELECT * FROM materials WHERE project_id = 2  -- query 3
... (20 more queries)
```

With DataLoader — what actually happens:

```
SELECT * FROM projects                                -- 1 query
SELECT * FROM materials WHERE project_id IN (1,2,...) -- 1 batched query
```

The key mechanism: DataLoader collects all `load(id)` calls that happen within the same tick of the event loop, then fires a single batch function with all the IDs. **It's automatic.** Each resolver just calls `this.materialsLoader.load(project.id)` — the batching is invisible.

**Critical:** The loader is `Scope.REQUEST` — a new instance per request. If it were a singleton, user A's data could leak into user B's request through the cache. Never use `Scope.DEFAULT` on a DataLoader.

### Step 2.3 — Test GraphQL subscriptions

Open Apollo Sandbox and subscribe:

```graphql
subscription {
  projectUpdated {
    id
    name
    status
    updatedAt
  }
}
```

Leave this running. In a second tab, run:

```graphql
mutation {
  updateProject(id: "YOUR_PROJECT_ID", input: { status: ACTIVE }) {
    id
    status
  }
}
```

The subscription tab should receive the update in real time. This uses WebSocket — observe the `ws://` URL in the Sandbox network tab.

### Step 2.4 — Generate a TypeORM migration

When `synchronize: true`, TypeORM silently modifies your schema. This is dangerous in production. The proper flow:

```bash
# 1. Add a new column to an entity (e.g. add `budget` to Project)
# 2. Generate a migration file
npm run migration:generate --name=AddBudgetToProject

# 3. Inspect the generated file in src/database/migrations/
# It contains UP (apply) and DOWN (revert) SQL

# 4. Run it
npm run migration:run
```

In production (and in the Kubernetes Job), you run `migration:run` — never `synchronize`.

---

## 5. Phase 3 — Next.js frontend

### Step 5.1 — Bootstrap Next.js

```bash
cd ../
npx create-next-app@latest frontend \
  --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"

cd frontend
npm install next-auth graphql graphql-request graphql-ws
```

### Step 5.2 — The most important concept: Server vs Client Components

This is the mental model that makes App Router click:

|                   | Server Component                        | Client Component                  |
| ----------------- | --------------------------------------- | --------------------------------- |
| **Runs on**       | Server only                             | Browser (and server for SSR)      |
| **Can use**       | async/await, secrets, direct DB/API     | useState, useEffect, browser APIs |
| **How to create** | Default (no directive needed)           | Add `'use client'` at top of file |
| **Data fetching** | Direct: `const data = await fetch(...)` | Hooks or effects                  |

**Rule:** Push `'use client'` as deep as possible. A page (`app/dashboard/page.tsx`) should be a Server Component that fetches data and passes it to Client Components only where interactivity is needed.

Open `app/dashboard/page.tsx`. Notice:

- No `'use client'` — it's a Server Component
- `const data = await client.request(PROJECTS_QUERY)` — direct async call, no useEffect
- Returns JSX with `<ProjectCard>` and `<CreateProjectButton>`

`ProjectCard` is also a Server Component (just a link, no state). `CreateProjectButton` is a Client Component (it opens a modal, manages form state).

### Step 5.3 — Understand Server Actions

Open `lib/actions/project.actions.ts`. Notice `'use server'` at the top.

Server Actions are async functions that run **on the server** but can be called from Client Components as if they were local functions. When a Client Component calls `createProject(formData)`, Next.js:

1. Serialises the arguments
2. Sends a POST request to a special internal endpoint
3. Executes the function on the server
4. Returns the result

No API route. No CORS. No client-side fetch boilerplate. The Server Action directly calls your NestJS backend with the user's JWT (from `getServerSession`).

After the mutation succeeds, `revalidatePath('/dashboard')` tells Next.js to invalidate the cached data for that path. The next request fetches fresh data.

#### Why have a Server Action at all? Why not call NestJS directly from the browser?

This is the question that determines whether the layering is correct. The short answer: **the business logic still lives in NestJS** — Server Actions are a thin transport adapter, not a duplicate domain layer.

Inspect `lib/actions/project.actions.ts` line-by-line and you'll see each function does exactly three things: read `FormData`, forward to a GraphQL mutation, call `revalidatePath`. There are zero authorization rules, zero validation, zero persistence — all of that stays in `projects.service.ts`, `projects.resolver.ts`, the `RolesGuard`, and the TypeORM entity.

A useful test: *"if I deleted the Server Action and called NestJS directly from the browser, what business rule would I lose?"* → Nothing. That's the signal the layering is right. The smell to watch for would be `if (formData.get('budget') > 1_000_000) throw …` inside a Server Action — that's business logic leaking out of NestJS, and it would mean a malicious direct GraphQL call could bypass the rule.

So why have the adapter at all? Six concrete reasons in this codebase:

1. **The JWT never enters the browser.** The session lives in NextAuth's HTTP-only cookie. `lib/graphql/client.ts` reads it server-side via `getServerSession()` and attaches `Authorization: Bearer …` from Node. If the browser called GraphQL directly, the access token would need to live in JS-readable storage — that's the difference between a "stolen cookie via CSRF" threat model and a "stolen token via any XSS" threat model.

2. **`revalidatePath` is server-only and required for fresh data.** It lives in Next's server runtime; the browser cannot call it. Without the Server Action, you'd need to manually hard-refresh or hand-roll a cache invalidation scheme.

3. **`<form action={createProject}>` works even when JS is disabled or still loading.** The form posts to a hidden Next-generated endpoint, the action runs, the page re-renders. That's progressive enhancement for free. A direct browser→GraphQL call requires JS to be present, loaded, and not errored.

4. **CSRF + origin validation come built in.** Next encrypts the action ID and validates the origin header on every Server Action POST. Direct browser→NestJS would require you to add this yourself, or rely entirely on Bearer tokens (re-introducing problem #1).

5. **Network topology in production.** In `docker-compose.yml` and the K8s manifests, NestJS is reachable internally as `http://backend:3001`. Server Actions run inside that network. With the action in place, NestJS stays private — only Next is public. Removing it forces you to expose port 3001 to the internet *and* configure CORS.

6. **`FormData` ↔ GraphQL impedance match.** Server Actions natively receive `FormData`, so the action body is just field reads. The browser would need a form library or hand-rolled `JSON.stringify` to talk to GraphQL.

Notice that `lib/graphql/client.ts` exposes both a server-only `gqlClient()` and a universal `gqlFetch()` that can run in the browser. The codebase makes a deliberate per-path choice: **mutations + initial reads go through Server Actions/RSC (private network, cookie auth), live subscriptions go directly browser→NestJS** (in `components/ProjectLiveUpdates.tsx`) because WebSockets can't tunnel through Server Actions. The dual URL logic in `gqlFetch` (internal Docker hostname when `typeof window === 'undefined'`, public URL otherwise) is what makes both paths work in the same codebase.

### Step 5.4 — Set up NextAuth

```bash
# Generate a secure NEXTAUTH_SECRET
openssl rand -base64 32
```

Copy to `.env.local`:

```
NEXTAUTH_SECRET=<your-generated-secret>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:3001/graphql
BACKEND_URL=http://localhost:3001
```

Open `lib/auth.ts`. The `CredentialsProvider` calls your NestJS `login` mutation. If it succeeds, NextAuth creates a JWT session cookie. The `jwt` callback stores the `accessToken` and `role` in the session token. The `session` callback exposes them on `session.accessToken`.

### Step 5.5 — Understand the middleware

Open `middleware.ts`. This runs on the Edge runtime **before** any page renders:

1. `withAuth` checks if a session token exists — no token → redirect to `/login`
2. The inner function checks role for `/admin` — non-admin → redirect to `/dashboard`

This protects routes without any server-side fetch on the page itself. The redirect happens at the CDN edge, before any React code runs.

### Step 5.6 — Run the frontend

```bash
npm run dev
```

Visit **http://localhost:3000**. You should be redirected to `/login`. Log in with the admin credentials you created in Step 1.6.

---

## 6. Phase 4 — Running locally with Docker Compose

### Step 6.1 — Build and run the full stack

```bash
cd sitetrack  # project root

# Build and start all services
docker compose up --build

# In a separate terminal, watch the logs
docker compose logs -f backend
```

**Why `package-lock.json` MUST be committed:** Both Dockerfiles run `npm ci` instead of `npm install`. `npm ci` requires `package-lock.json` and pins every transitive dependency to the exact version recorded there — so every developer, every CI run, and every production image installs the same dependency tree. Without the lockfile, `npm ci` fails outright (try it: delete `backend/package-lock.json`, then `docker compose build` — you'll get `EUSAGE: The npm ci command can only install with an existing package-lock.json`). Always commit both `backend/package-lock.json` and `frontend/package-lock.json` to git. If you ever need to regenerate them, run `npm install` in each directory.

### Step 6.2 — What docker-compose.yml teaches you

Open `docker-compose.yml`. Note:

**Service discovery:** The backend connects to `postgres` (the service name), not `localhost`. Inside Docker's network, services find each other by name. The backend's `DB_HOST: postgres` resolves to the postgres container's IP automatically.

**Health checks:** The `depends_on` with `condition: service_healthy` means the backend won't start until PostgreSQL's `pg_isready` succeeds. Without this, the backend crashes on startup because the DB isn't ready yet.

**Volume mounts for hot reload:** `./backend/src:/app/src` mounts your local source into the container. When you save a file, NestJS hot-reloads inside the container — no rebuild needed.

### Step 6.3 — Test the full stack

```bash
# Create a user via GraphQL (backend)
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { register(input: { email: \"admin@sitetrack.com\", name: \"Admin\", password: \"password123\", role: ADMIN }) { accessToken } }"}'

# Log in via the Next.js UI
open http://localhost:3000
```

---

## 7. Phase 5 — Kubernetes deployment

### Step 7.1 — Start minikube

```bash
minikube start --memory=4096 --cpus=2

# Enable the Ingress addon (nginx ingress controller)
minikube addons enable ingress

# Point your terminal's Docker to minikube's Docker daemon
# This lets you build images directly into minikube without pushing to a registry
eval $(minikube docker-env)
```

### Step 7.2 — Build images into minikube

```bash
# Build both images (Docker context is now minikube's daemon)
docker build -t sitetrack-backend:local ./backend
docker build -t sitetrack-frontend:local ./frontend
```

### Step 7.3 — Update image references for local use

Edit `k8s/backend/deployment.yaml` — change the image line:

```yaml
image: sitetrack-backend:local
```

Add `imagePullPolicy: Never` so K8s uses the local image instead of trying to pull from a registry:

```yaml
imagePullPolicy: Never
```

Do the same for `k8s/frontend/deployment.yaml`.

### Step 7.4 — Deploy in order

Order matters. Dependencies must exist before what depends on them.

```bash
# 1. Create the namespace
kubectl apply -f k8s/namespace.yaml

# 2. PostgreSQL (everything depends on this)
kubectl apply -f k8s/postgres/secret.yaml
kubectl apply -f k8s/postgres/statefulset.yaml
kubectl apply -f k8s/postgres/service.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod/postgres-0 -n sitetrack --timeout=120s

# 3. Run migrations (before the backend starts)
kubectl apply -f k8s/backend/configmap.yaml
kubectl apply -f k8s/backend/secret.yaml
kubectl apply -f k8s/migration-job.yaml

# Watch the migration job
kubectl logs -f job/db-migrate -n sitetrack

# Wait for migrations to complete
kubectl wait --for=condition=complete job/db-migrate -n sitetrack --timeout=120s

# 4. Deploy backend
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml

# Watch the rollout
kubectl rollout status deployment/backend -n sitetrack

# 5. Deploy frontend
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/ingress.yaml

kubectl rollout status deployment/frontend -n sitetrack

# 6. Verify everything is running
kubectl get all -n sitetrack
```

### Step 7.5 — Access the application

```bash
# Get the minikube IP
minikube ip

# Add to /etc/hosts (replace with your minikube IP)
echo "$(minikube ip)  sitetrack.local" | sudo tee -a /etc/hosts

# Open in browser
open http://sitetrack.local
```

### Step 7.6 — Understand what you deployed

```bash
# Show all pods — should see postgres-0, 2x backend, 2x frontend
kubectl get pods -n sitetrack

# Describe a pod to see probe status, events, resource usage
kubectl describe pod -l app=backend -n sitetrack

# Stream logs from all backend pods
kubectl logs -l app=backend -n sitetrack -f

# Test health probes directly
kubectl exec -it -n sitetrack \
  $(kubectl get pod -l app=backend -n sitetrack -o jsonpath='{.items[0].metadata.name}') \
  -- wget -qO- http://localhost:3001/health/ready
```

### Step 7.7 — Test liveness and readiness probes

**Understand the difference:**

```
livenessProbe  → "Is the process alive?"
                  Fails → K8s RESTARTS the pod
                  Endpoint: /health/live (always 200 if the process runs)

readinessProbe → "Is the pod ready to receive traffic?"
                  Fails → K8s REMOVES pod from load balancer (doesn't restart)
                  Endpoint: /health/ready (checks DB connection too)
```

Simulate a readiness failure by stopping PostgreSQL:

```bash
kubectl scale statefulset postgres --replicas=0 -n sitetrack

# Watch backend pods become unready (removed from service endpoints)
kubectl get endpoints backend-svc -n sitetrack -w

# Restore
kubectl scale statefulset postgres --replicas=1 -n sitetrack
```

### Step 7.8 — Test rolling updates

```bash
# Simulate deploying a new version (change image tag)
kubectl set image deployment/backend \
  backend=sitetrack-backend:local \
  -n sitetrack

# Watch the rolling update — old pods stay until new ones are ready
kubectl rollout status deployment/backend -n sitetrack

# Roll back if something went wrong
kubectl rollout undo deployment/backend -n sitetrack
```

---

## 8. Phase 6 — GitHub Actions CI/CD

### Step 8.1 — Push to GitHub

```bash
cd sitetrack
git init
git add .
git commit -m "feat: initial SiteTrack implementation"

# Create a repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/sitetrack.git
git push -u origin main
```

### Step 8.2 — Configure GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions**.

Add these secrets:

- `KUBE_CONFIG` — base64-encoded kubeconfig: `cat ~/.kube/config | base64`
- `DB_PASSWORD` — your production PostgreSQL password
- `JWT_SECRET` — `openssl rand -base64 48`
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`

### Step 8.3 — Understand the pipeline

Open `.github/workflows/ci.yml`. The three jobs run in sequence:

```
test  →  build  →  deploy
```

**test** runs on every push and every PR. It spins up a real PostgreSQL service container and runs unit tests + e2e tests. If any test fails, `build` and `deploy` never run.

**build** only runs on pushes to `main` (not PRs). It builds Docker images and pushes them to GHCR (GitHub Container Registry) tagged with both `latest` and the commit SHA. Using the commit SHA means you can always trace exactly which code is running in production.

**deploy** only runs on `main`, requires manual approval (via GitHub Environments), and:

1. Applies namespace + config
2. Runs the migration Job and waits for it to complete
3. Deploys backend (rolling update)
4. Deploys frontend
5. Verifies all pods are running

### Step 8.4 — Observe a pipeline run

Push a change and watch the run at `github.com/YOUR_USERNAME/sitetrack/actions`. Click into the `test` job and watch the steps execute in real time. Notice:

- The `postgres` service container starts before the test steps
- `npm ci` uses the cache from previous runs (faster)
- Coverage threshold failures will fail the build

---

## 9. Key concepts reference

### NestJS dependency injection

```typescript
// Any class decorated with @Injectable() can be injected
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) // TypeORM injects the repository
    private readonly repo: Repository<Project>,
    private readonly loader: MaterialsByProjectLoader, // your DataLoader
  ) {}
}
```

NestJS's IoC container creates one instance per scope and injects it wherever needed. You never call `new ProjectsService()` — the container does it.

### GraphQL context flow

```
Request → NestJS HTTP → Passport JWT Strategy
                           ↓ validates token
                           ↓ calls UsersService.findOne(payload.sub)
                           ↓ attaches user to req.user
         → Apollo Server → resolves ctx.req.user
         → JwtAuthGuard.getRequest() → returns ctx.req
         → Guard sees req.user → allows/denies
         → Resolver → @CurrentUser() extracts req.user → your handler
```

### TypeORM migration workflow

```bash
# 1. Modify an entity
# 2. Generate migration (reads the diff between entity and DB schema)
npm run migration:generate --name=MyMigration

# 3. Review the generated SQL in src/database/migrations/
# 4. Apply
npm run migration:run

# 5. If something went wrong
npm run migration:revert
```

### Next.js data fetching decision tree

```
Does this component need interactivity (clicks, forms, browser APIs)?
  YES → Client Component ('use client')
  NO  → Server Component (default)

Does a Client Component need to mutate data?
  YES → Server Action ('use server' function)
         - Runs on the server
         - Has access to session/secrets
         - Calls revalidatePath() to refresh stale data

Does a Server Component need fresh data on every request?
  YES → No caching: fetch(..., { cache: 'no-store' })
  NO  → Default caching is fine (or revalidate on a schedule)
```

### Kubernetes object purposes

| Object                | Purpose                                              | When to use                      |
| --------------------- | ---------------------------------------------------- | -------------------------------- |
| Deployment            | Manages stateless pods with rolling updates          | Your app servers                 |
| StatefulSet           | Manages stateful pods with stable identity + storage | Databases, message brokers       |
| Service (ClusterIP)   | Internal load balancer / DNS name                    | Any pod-to-pod communication     |
| Ingress               | External HTTP routing                                | Expose your app to the internet  |
| ConfigMap             | Non-sensitive config key/value pairs                 | ENV vars that aren't secrets     |
| Secret                | Sensitive config (passwords, tokens)                 | Passwords, API keys, JWT secrets |
| Job                   | One-time task that runs to completion                | DB migrations, data imports      |
| PersistentVolumeClaim | Request for durable storage                          | Database data directories        |

---

## 10. Troubleshooting

### Backend won't start — "CONFIG VALIDATION ERROR"

Joi validation failed. Check your `.env` file has all required keys from `app.module.ts`. Most common: `JWT_SECRET` must be at least 32 characters.

### GraphQL "Cannot read property of undefined" in resolver

Usually a null relation. Check that your query includes the relation in `findOne()`:

```typescript
this.repo.findOne({ where: { id }, relations: { manager: true } });
```

(TypeORM 1.x removed the array shorthand `relations: ['manager']`. The object form supports nested relations like `{ manager: { team: true } }` and is the only accepted shape going forward.)

### DataLoader returning wrong results

The batch function must return results in **the same order** as the input keys. If you return materials sorted differently, DataLoader will match them to the wrong projects. Always build the `Map` and return `keys.map(k => map.get(k))`.

### K8s pod stuck in "Pending"

```bash
kubectl describe pod POD_NAME -n sitetrack
```

Look at the `Events` section. Common causes:

- `Insufficient memory` → reduce resource requests in deployment.yaml
- `Unschedulable` → minikube doesn't have enough resources (`minikube start --memory=4096`)

### K8s pod "CrashLoopBackOff"

```bash
# Get the logs from the crashed container
kubectl logs POD_NAME -n sitetrack --previous
```

The `--previous` flag shows logs from the previous (crashed) container instance.

### Migration Job fails

```bash
kubectl logs job/db-migrate -n sitetrack
```

Common cause: DB not reachable. Make sure the StatefulSet is ready before running the Job.

### Next.js "Hydration mismatch"

A component renders differently on server vs client. Most common cause: a Client Component reads `window` or browser-only APIs during SSR. Wrap with:

```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

### WebSocket subscription not connecting

Check `NEXT_PUBLIC_GRAPHQL_WS_URL` is set at build time (not runtime). `NEXT_PUBLIC_` vars are baked in during `next build`. If you change them, you must rebuild the image.
