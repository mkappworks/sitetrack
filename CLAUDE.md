# CLAUDE.md — patterns and conventions

Codified patterns this repo uses. Read before adding a new entity, form, mutation, or list view; the next domain should be ~80% mechanical pattern-matching, not ~80% re-derivation.

---

## Backend (NestJS + TypeORM + Apollo GraphQL)

### Entity + GraphQL ObjectType in one class
- `@ObjectType()` + `@Entity()` on the same class. `@Field()` for GraphQL exposure, `@Column()` for storage.
- Never expose `password_hash` — no `@Field()` decorator.
- For Postgres `date` columns use a TypeORM column transformer to convert `string ↔ Date`; the GraphQL `DateTime` scalar can't serialize the pg driver's string output. See `Project.startDate`.
- For derived (non-stored) GraphQL fields like `Project.materialCount`, declare `@Field()` without `@Column()`. The resolver provides the value via `@ResolveField`.

### Pagination
- All top-level list queries return `XPage` (built from `Paginated(T)` factory in `common/pagination/paginated.type.ts`). Items + total + limit + offset.
- Always use a single `@ArgsType` class for resolver args. Mixing `@Args() PaginationArgs` with a separate `@Args('foo')` breaks the global `ValidationPipe` (`whitelist + forbidNonWhitelisted` in `main.ts`) — the second arg gets rejected as non-whitelisted the moment it has a value.
- For searchable lists, extend `PaginationArgs` → `SearchablePaginationArgs` and pass the merged args object.
- Filter and search MUST be applied via `andWhere(...)` BEFORE `take()/skip()`. Otherwise `getManyAndCount`'s total reflects the wrong row set.

### DataLoaders
- All field resolvers that touch a relation must batch via a `DataLoader`. Otherwise N+1.
- Loader files live in `<domain>/loaders/*.loader.ts`, are `@Injectable({ scope: Scope.REQUEST })`, and follow the input-key-order contract: the output array must have the same length as the input array, with `[]` / `0` / `new Error(...)` per missing key.
- A `Scope.REQUEST` loader scope-bubbles to any class that injects it. To keep the parent resolver singleton (required for `@Subscription`), split the field resolver into its own class — e.g. `ProjectMaterialsResolver` is separate from `ProjectsResolver`.
- The loader's @InjectRepository entity must be registered in the local module's `TypeOrmModule.forFeature([...])`. We register cross-module entities only for loader DI; we do NOT export the service from the entity's home module.

### Service layer
- Repository injected via `@InjectRepository`. For transactions, also inject `DataSource` via `@InjectDataSource`.
- Transactions: `dataSource.transaction(async (manager) => { ... })`. EVERY write inside the callback uses the passed-in `manager`, NOT `this.repo` — using the repo escapes the transaction and breaks rollback. The unit spec `projects.service.spec.ts` asserts `projectsRepo.save` was NEVER called to enforce this.
- For partial updates, never `Object.assign(entity, input)`. `class-transformer` + `useDefineForClassFields` materializes optional DTO fields as own `undefined` properties, which would clobber unchanged columns. Iterate `Object.entries(input)` and skip `undefined`.
- **When updating an FK column, clear the loaded relation object first** (`entity.manager = undefined`). If `findOne({ relations: { manager: true } })` loaded the relation, TypeORM's `save()` prefers the relation object's id over the explicit FK column — silently reverting your update. Same place we map `'' → null` for unassign semantics.
- **Soft delete via `@DeleteDateColumn` + `softRemove`** (not `remove`). Default `find()` queries automatically exclude soft-removed rows. For `@OneToMany` children that should follow the parent into the trash, add `cascade: ['soft-remove']` on the relation. Resurrecting rows: `repo.restore(id)`. Mixing `remove()` and `softRemove()` across services is the #1 soft-delete bug.

### Aggregated stats query (don't aggregate client-side)
- For "how many of each status?" type queries, push the aggregation to Postgres with a `GROUP BY` query, not a client-side `reduce` over a paginated list. The dashboard's `projectStatusCounts` is the canonical example: it returns 5 rows (one per status enum) regardless of total project count and is correct at any scale. Computing the same from `projects.items` lies the moment the list is paginated.
- Return shape: `[{ status: Enum, count: Int }]`. Object type goes in `<domain>/dto/<x>-count.type.ts` so it stays out of the entity's namespace.

### DTOs
- Inputs are `@InputType()`, validated with `class-validator` decorators (`@IsString`, `@IsEnum`, etc.).
- For nested arrays, `@ValidateNested({ each: true })` ALONE doesn't recurse — you also need `@Type(() => ItemClass)` from `class-transformer`. Without `@Type`, per-item rules are silently skipped.
- `@ArrayMinSize(1)` for non-optional arrays.

### Authorization
- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` on resolver methods. `RolesGuard` short-circuits with ADMIN always passing — so `@Roles(MANAGER)` means "manager or admin," not "manager only."
- For single-item queries like `user(id)`, default to admin-only. Users see their own data via `me`, not via `user(id: theirOwnId)`.

### Refresh-token rotation
- Access tokens: short-lived JWT (15-min default via `JWT_EXPIRES_IN`). Refresh tokens: opaque 256-bit hex strings, hashed (sha256) on disk in `refresh_tokens` (30-day default via `REFRESH_TOKEN_TTL_DAYS`). The DB never holds a usable bearer credential — a leak alone can't replay sessions.
- **Rotation chain via `familyId`**. First issue: `familyId = self.id` (self-reference for the chain head). Each rotation marks the old row `revokedAt = now`, `replacedByTokenId = newRow.id`, and the new row inherits the same `familyId`. The chain head's id IS the family handle; no separate table.
- **Reuse-detection.** Presenting a token that's already revoked = theft canary (either the legitimate client rotated and the attacker is replaying, or vice-versa). Cannot distinguish; revoke the WHOLE family via `revokeFamily(familyId)` and force re-login. Locked in by spec: `refresh-token.service.spec.ts` `'detects reuse and revokes the entire family'`.
- **Logout is unauthenticated by design.** Possession of the refresh token IS the auth — if logout required an access token, a refresh token couldn't be revoked once its companion access token had expired. `logout()` always returns `true` so attackers can't probe "is this token valid?"
- **Backend rate-limits** `login` 5/15min and `refreshTokens` 30/5min per IP via `@nestjs/throttler` + `GqlThrottlerGuard`. Login is tight (brute-force surface); refresh is generous (legitimate sessions refresh ~every 14m with parallel-tab headroom).
- **No grace window on rotation** — strict invalidation. Multi-tab races are mitigated frontend-side via an in-process Promise dedupe (see `lib/auth.ts:refreshOnce`). Multi-process / multi-server races would still surface as forced re-login; Redis-backed lock is the production fix when scaling out.
- **`sid` claim = session handle.** The access token carries `sid` = the refresh-token `familyId` (login issues the refresh token first so the access token can embed it; rotation preserves it). `JwtStrategy.validate` stashes it on `req.user.sid`; read it with `@CurrentSessionId()`. This is what lets the sessions UI flag "this device."

### Active sessions (devices)
- One live token per family (rotation revokes predecessors), so the set of live, unexpired `refresh_tokens` for a user IS their active-session list. `Session.id` exposed to GraphQL is the `familyId`; the row's hash is never exposed.
- `revokeSessionForUser(userId, familyId)` is ownership-guarded — it revokes the family only if a live token in it belongs to that user, so the self-service `revokeSession` can't touch someone else's session even if an id leaks.
- Resolver split: `mySessions`/`revokeSession` (self; current device flagged via `sid`), `userSessions`/`revokeUserSession`/`revokeAllUserSessions` (admin; `current` always false). Frontend: `/settings` (self) + `/admin/users/[id]` (admin), sharing `components/SessionList.tsx`.

### Audit log
- Append-only `audit_log` of destructive data ops + auth events (NOT routine create/update — that's noise). Actor id/email + target label are **denormalized snapshots** so the trail survives later deletion of the actor or target.
- **Two write paths, by intent.** `AuditService.record()` is best-effort (swallows + logs failures) — used for auth events where a failed audit insert must never block a login. `recordTx(manager, …)` is transactional (rethrows) — used for destructive ops so the audit row commits atomically with the data change. Picking the wrong one defeats the purpose: swallowing inside a txn makes it pointless; throwing on a login audit blocks logins.
- **Destructive ops are transactional.** project/equipment/material soft-delete/restore/purge run inside `dataSource.transaction`; every write (incl. `recordTx`) uses the passed manager. Equipments + materials services gained `@InjectDataSource` for this. Specs assert the write goes through the txn manager, not the repo.
- **`AuditModule` is `@Global`** so services inject `AuditService` via `@Optional()` — unit specs construct without wiring it (audit becomes a no-op). It deliberately does NOT import `AuthModule` (the auth services depend on `AuditService`, so that edge would invert provider init-order and silently inject `undefined`); the resolver's guards are dependency-light and registered locally instead.

### Testing
- Unit specs mock repositories + (when relevant) `DataSource`. Tests assert service contracts in isolation — they do NOT go through GraphQL routing or the `ValidationPipe`. That gap means resolver-level bugs (e.g. the search/PaginationArgs incident) won't be caught by unit tests; consider an integration test against a real Postgres when wiring resolver-level args.
- `test/projects.transaction.e2e-spec.ts` is the pattern for integration tests against real Postgres. Uses a separate `sitetrack_test` DB, `synchronize + dropSchema: true`. Covers things mocks can't (real ROLLBACK).
- All loaders should have unit tests asserting batching + key-order contract.

---

## Frontend (Next.js 16 App Router + TanStack Query + TanStack Form)

### Layers
- `lib/graphql/queries.ts` — GraphQL query/mutation strings.
- `lib/graphql/schemas.ts` — Zod **response** schemas + inferred types. Validates the wire at the trust boundary.
- `lib/validation/forms.ts` — Zod **input** schemas. Shared with Server Actions for client + server validation.
- `lib/queries/<domain>.ts` — `queryOptions()` factories and a `keys` record. Same factory consumed by Server Component `prefetchQuery` and Client Component `useQuery` — guarantees key parity for hydration.
- `lib/actions/<domain>.actions.ts` — Server Actions. Typed input → `ActionResult<T>` (discriminated `{ ok, data | error }`). `safeParse` with the shared Zod schema at the boundary.
- `lib/mutations/<domain>.ts` — `useMutation` wrappers around Server Actions. `unwrap()` helper bridges `ActionResult` → throw-on-error so `onError` handles business errors uniformly.

### Data fetching in pages
- Default (list + detail pages): Server Component does `await prefetchQuery` + `dehydrate` + `<HydrationBoundary>`; the Client Component inside subscribes via `useQuery` to the same key. SSR-complete render (no skeleton), and optimistic patches flow to UI without a refresh. Key parity between the page's prefetch and the client's `useQuery` is mandatory or hydration misses and it refetches.
- Dashboard = **streaming (pattern C)**: each section (`StatusSummarySection`, `RecentProjectsSection`) is an async Server Component under its OWN `<Suspense>` that `await`s its prefetch *inside the section* (so the page never blocks and sections stream independently), then dehydrates into a `<HydrationBoundary>` whose client child subscribes. Gets per-section streaming + SSR-baked data + a reactive cache at once. Decision rule: internal/authed pages → stream; SEO/public content would block the indexable core instead.
- The `staleTime: 60_000` default in `lib/get-query-client.ts` prevents an immediate refetch right after SSR hydration. The dashboard client reads override `staleTime: 0` (hydrate-then-revalidate) so a change made elsewhere/another tab is reflected on return rather than served 60s-stale. Scope such overrides to the consumer; don't change the global default.

### Mutations
- Server Action does the write. `useMutation` wraps it for the UX layer (state machine, optimistic updates, cache invalidation).
- Optimistic lifecycle: `onMutate` (snapshot → patch → return ctx) → `onError` (restore from ctx) → `onSettled` (invalidate the affected cache key). Extracted into `useOptimisticDetailMutation(detailKey, patch, extraInvalidateKeys)` in `lib/mutations/optimistic.ts` — rollback restores the snapshot (no inverse function needed), so each hook declares only its key + pure patch. The five project/material optimistic hooks are built on it; the contract is locked by `projects.test.ts` (status patch + material array patch/rollback).
- For mutations that don't need optimism, just `onSuccess: () => invalidateQueries(...)`.
- `revalidatePath` (Next.js) vs `invalidateQueries` (TanStack Query) invalidate DIFFERENT caches. The detail page subscribes via `useQuery`, so `invalidateQueries` is what reactivates it. The list pages use prefetch + hydration; `revalidatePath` re-runs the Server Component on next navigation. Use whichever matches the consumer.

### Forms
- TanStack Form (`useForm`) with `validators: { onChange: zodSchema }`. The schema's input type MUST exactly match the form's `defaultValues` shape — TanStack Form v1's Standard Schema interop checks both at TypeScript level. For optional text fields, declare as required strings in the schema (allowing `''`) and strip empty → `undefined` in the Server Action before the wire.
- Label inputs by wrapping `<input>` inside `<label>`. The sibling-`<label>` + no-`htmlFor` pattern looks fine visually but breaks screen readers AND `getByLabelText` queries.
- `form.Subscribe` for whole-form derived state (`canSubmit`, `isSubmitting`) — avoids re-rendering every field on submit-button updates.
- For dynamic arrays use `form.Field name="materials" mode="array"` with `pushValue` / `removeValue` handles; nested fields use the synthetic path `materials[${i}].name`.

### URL-driven state
- Pagination `?page=N`, search `?q=term`. Server Component reads `searchParams`, passes to Client Component. Client Component drives URL via `router.push(...)` so back/forward + shareable links Just Work.
- Debounce search input (300ms) before pushing to URL.

### Destructive confirmation modal
- `components/ConfirmDeleteModal.tsx` replaces native `confirm()` everywhere. Focus lands on Cancel on open (Enter doesn't accidentally delete), Escape closes (unless mid-mutation), backdrop click closes (unless mid-mutation). Used by project/equipment/material delete with the same shape per call site.
- Pair with the mutation's `reset()` in `onCancel` so an error from a prior attempt doesn't carry over into the next modal open.

### NextAuth + refresh-token integration
- The JWT cookie stores `accessToken`, `refreshToken`, and `accessTokenExpiresAt` (ms since epoch). The `session()` callback exposes ONLY `accessToken` to consumers — refresh stays server-side, never crosses into Client Component code.
- **Proactive refresh** in the `jwt` callback: when `Date.now() > expiresAt - 60_000`, call the backend's `refreshTokens` mutation, persist the rotated pair on the JWT, and return. This is the primary refresh path.
- **Client-side 401 retry** (the fallback) lives in `gqlFetch`: on an auth error, in the browser only, it calls `getSession()` (re-runs the jwt callback → rotates), then retries ONCE with the fresh token. Guards: single retry via an internal flag; only retries if the refreshed token actually *differs* (a genuine permission error won't loop). Server-side requests skip it — `getServerSession` is always fresh.
- **Parallel-tab race dedupe** via in-process `Map<refreshToken, Promise>`. First jwt() call sets the promise; concurrent callers await the same promise and receive the same rotated tokens — avoids triggering backend reuse-detection (which would revoke the whole family) on legitimate same-process races.
- **Refresh failure** (network down, reuse-detection fired, token expired) → set `token.error = 'RefreshAccessTokenError'` and clear access fields. The `session` callback surfaces `session.error`, and consumers/middleware can react.
- **signOut event** posts the refresh token to the backend's `logout` mutation as a best-effort revocation. Failure is swallowed — the client cookie is already cleared by NextAuth.
- **Server-fetched pages gate via `requireAuthedSession()`** (`lib/require-session.ts`), not raw `getServerSession`: it redirects to `/login?expired=1` when the session is missing, errored (`RefreshAccessTokenError`), or token-less. A Server Component can't run the client 401-retry or rotate the cookie, so a dead session would otherwise throw "Unauthorized" into the route error boundary. `/login` clears the dead cookie on `?expired=1`.

### Error boundaries (`error.tsx` per top-level route segment)
- Each top-level route (`/dashboard`, `/projects`, `/equipments`, `/admin`, `/settings`) has an `error.tsx` that delegates to `components/ErrorState.tsx`. Sub-segments inherit the parent's boundary.
- `error.tsx` must be `'use client'`. It receives `error` (with optional `digest` to correlate with server logs) + `reset` (rerun the segment). Log to `console.error` in `useEffect` so any future remote sink picks it up.

### Manager-assignment dropdown
- `components/ManagerSelect.tsx` is the reusable admin-only field. Internally `useSession()` + `useQuery(managersQueryOptions)`; renders `null` for non-admins so callers don't need to gate.
- All schemas that accept `managerId` declare it as `z.string()` (empty-string allowed) to satisfy TanStack Form's Standard Schema interop. The Server Action then maps `'' → null` (explicit unassign) and a real uuid → uuid. **Don't use `|| undefined` for `managerId`** — that swallows the unassign intent.
- On edit forms, pass `currentManagerId` + `currentManagerName` so the dropdown shows "Currently: <name>" above + "— current" on the matching option + "· unsaved change" in amber when the form value drifts from the saved value. Create forms omit both props (no current assignment yet).

### Trash / Restore / Purge
- Backend `findDeleted()`: `withDeleted: true` + `where: { deletedAt: Not(IsNull()) }`. Returns soft-deleted rows only.
- Backend `restore(id)`: calls `repo.restore(id)` then re-fetches with relations (restore itself returns void).
- Backend `purge(id)`: hard delete. Loads with `withDeleted: true`, throws `BadRequestException` if `deletedAt` is null (refuses to purge an active row — the two-step "soft-delete first, then purge" flow is enforced server-side and locked in by spec). Then `repo.delete(id)`. Materials cascade via the `@ManyToOne` FK `onDelete: 'CASCADE'`.
- Frontend `/admin/trash` has two sections; each row gets Restore (button) + Purge (red link → ConfirmDeleteModal with stronger copy).
- **Bulk select**: each row has a checkbox; section headers have "Select all"; selection lives as a `Set<string>` per section in `TrashClient`. A contextual action bar (fixed bottom-center) appears when `totalSelected > 0` offering Restore N / Purge N / Clear. Bulk operations are `Promise.all` over the existing single-id mutations with `.catch(() => null)` per call — same network cost as a real bulk endpoint at this scale (~5-20 rows) and the existing per-row mutation already invalidates the affected caches. NOT a separate backend bulk mutation — frontend loop is enough.
- `useRestoreProject` / `useRestoreEquipment` invalidate BOTH trash + active-list caches. `usePurgeProject` / `usePurgeEquipment` invalidate the same two caches (the active-list invalidation is a safety net — the row was already absent there).
- Expose `@DeleteDateColumn` to GraphQL via `@Field({ nullable: true })` when you want the trash UI to display "deleted at" accurately — the column otherwise stays on the entity but invisible to clients.

### Tests
- `npm test` (Vitest 4.1 + RTL + jsdom). Setup file `test/setup.ts` registers `jest-dom` matchers AND globally stubs `next-auth/react` with a default VIEWER session so any component using `useSession()` (e.g. `ManagerSelect`) renders in jsdom without a real `SessionProvider`. Individual tests can override via `vi.mocked(useSession)`.
- `test/test-utils.tsx` provides `renderWithQueryClient` (wraps `<QueryClientProvider>` for any component using TanStack Query/Form) and `renderHookWithQueryClient` (same for hook-only tests).
- For form tests, prefer `getByLabelText(/regex/i)` if the form is properly label-associated; fall back to `getByPlaceholderText` for unique inputs (more robust against label-text changes).
- Server Actions are `vi.mock`'d so tests don't reach the backend. Assert the action was called with the exact typed input shape — that's the contract.
- The mutation-hook test (`lib/mutations/projects.test.ts`) is the architecture-locking test: it exercises the optimistic + rollback lifecycle. Any new optimistic mutation gets the same shape of test.

---

## Conventions that don't fit elsewhere

- Commits: atomic-in-intent (not minimal-diff). Bundle cross-cutting changes that belong to the same logical unit even if they span backend + frontend. Example: a single "add search to projects" commit covered backend service + resolver + schema + frontend query + queryOptions + page + ListClient — one feature, one commit.
- Comments: default no. Explain non-obvious *WHY* (workaround, invariant, framework quirk). Don't narrate WHAT — code names already do that.
- Seed data: `npm run seed` in backend. Guarded by `NODE_ENV=development` + sentinel-row idempotency. Don't echo passwords in logs.
- Schema changes: `synchronize: true` in dev for fast iteration. Migrations for prod via `npm run migration:generate` / `migration:run`. Schema-altering decorators on entities; never raw SQL outside migrations.

---

## What's intentionally NOT done yet

These are deferred decisions, not oversights:

- **Cursor pagination on field resolvers** (`Project.materials`, `User.projects`). At seeded scale they're fine. The trade is "DataLoader batching" vs "per-key cursor" — when a project gets >100 materials, take the trade.
- **Multi-process refresh-token race dedupe.** In-process `Map` covers same-process races; multi-process / multi-server deployments would still trigger reuse-detection on a benign parallel-tab refresh. Redis-backed lock is the prod fix.
- **Migrations not auto-run.** Dev uses `synchronize: true`; the trigram-index migration must be applied with `npm run migration:run` (and in prod). The two are not reconciled — `synchronize` won't create the trigram indexes (they need raw SQL), so dev relies on the migration too for search to be indexed.
- **Resolver-level integration tests.** Unit specs mock repos and don't exercise guards/throttle/validation. The session + audit resolvers' auth gating is reasoned, not tested through GraphQL. An integration suite against real Postgres would close it.
- **Layout duplication.** Five route-group layouts (`dashboard`/`projects`/`equipments`/`admin`/`settings`) are identical sidebar shells. Hoist to a shared layout when the next one appears.
