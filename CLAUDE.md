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

### DTOs
- Inputs are `@InputType()`, validated with `class-validator` decorators (`@IsString`, `@IsEnum`, etc.).
- For nested arrays, `@ValidateNested({ each: true })` ALONE doesn't recurse — you also need `@Type(() => ItemClass)` from `class-transformer`. Without `@Type`, per-item rules are silently skipped.
- `@ArrayMinSize(1)` for non-optional arrays.

### Authorization
- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` on resolver methods. `RolesGuard` short-circuits with ADMIN always passing — so `@Roles(MANAGER)` means "manager or admin," not "manager only."
- For single-item queries like `user(id)`, default to admin-only. Users see their own data via `me`, not via `user(id: theirOwnId)`.

### Testing
- Unit specs mock repositories + (when relevant) `DataSource`. Tests assert service contracts in isolation — they do NOT go through GraphQL routing or the `ValidationPipe`. That gap means resolver-level bugs (see the search/PaginationArgs incident, `c0812bf`) won't be caught by unit tests; consider an integration test against a real Postgres when wiring resolver-level args.
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
- Server Component: prefetch + dehydrate + `<HydrationBoundary>`. The Client Component inside subscribes via `useQuery` to the same cache key. Optimistic patches flow through to UI without a refresh.
- For pages that render directly without a Client Component subscriber, use `queryClient.fetchQuery()` (returns data) instead of `prefetchQuery + boundary`. Dashboard does this; project/equipment detail pages use the boundary pattern because they need reactivity to cache mutations.
- The `staleTime: 60_000` default in `lib/get-query-client.ts` prevents an immediate refetch on the client right after SSR hydration. Don't lower it without thinking through the cache-warm vs freshness trade.

### Mutations
- Server Action does the write. `useMutation` wraps it for the UX layer (state machine, optimistic updates, cache invalidation).
- Optimistic lifecycle: `onMutate` (snapshot → patch → return ctx) → `onError` (restore from ctx) → `onSettled` (invalidate the affected cache key). All four optimistic hooks in `lib/mutations/projects.ts` follow this pattern; the rollback contract is locked in by `projects.test.ts`.
- For mutations that don't need optimism, just `onSuccess: () => invalidateQueries(...)`.
- `revalidatePath` (Next.js) vs `invalidateQueries` (TanStack Query) invalidate DIFFERENT caches. The detail page subscribes via `useQuery`, so `invalidateQueries` is what reactivates it. The list pages use prefetch + hydration; `revalidatePath` re-runs the Server Component on next navigation. Use whichever matches the consumer.

### Forms
- TanStack Form (`useForm`) with `validators: { onChange: zodSchema }`. The schema's input type MUST exactly match the form's `defaultValues` shape — TanStack Form v1's Standard Schema interop checks both at TypeScript level. For optional text fields, declare as required strings in the schema (allowing `''`) and strip empty → `undefined` in the Server Action before the wire.
- Label inputs by wrapping `<input>` inside `<label>`. The sibling-`<label>` + no-`htmlFor` pattern looks fine visually but breaks screen readers AND `getByLabelText` queries. See `c307989` for examples.
- `form.Subscribe` for whole-form derived state (`canSubmit`, `isSubmitting`) — avoids re-rendering every field on submit-button updates.
- For dynamic arrays use `form.Field name="materials" mode="array"` with `pushValue` / `removeValue` handles; nested fields use the synthetic path `materials[${i}].name`.

### URL-driven state
- Pagination `?page=N`, search `?q=term`. Server Component reads `searchParams`, passes to Client Component. Client Component drives URL via `router.push(...)` so back/forward + shareable links Just Work.
- Debounce search input (300ms) before pushing to URL.

### Tests
- `npm test` (Vitest 4.1 + RTL + jsdom). Setup file `test/setup.ts` registers `jest-dom` matchers.
- `test/test-utils.tsx` provides `renderWithQueryClient` (wraps `<QueryClientProvider>` for any component using TanStack Query/Form) and `renderHookWithQueryClient` (same for hook-only tests).
- For form tests, prefer `getByLabelText(/regex/i)` if the form is properly label-associated; fall back to `getByPlaceholderText` for unique inputs (more robust against label-text changes).
- Server Actions are `vi.mock`'d so tests don't reach the backend. Assert the action was called with the exact typed input shape — that's the contract.
- The mutation-hook test (`lib/mutations/projects.test.ts`) is the architecture-locking test: it exercises the optimistic + rollback lifecycle. Any new optimistic mutation gets the same shape of test.

---

## Conventions that don't fit elsewhere

- Commits: atomic-in-intent (not minimal-diff). Bundle cross-cutting changes that belong to the same logical unit even if they span backend + frontend. Recent example: `f2bc568 feat(stack): add search to projects` covered backend service + resolver + schema + frontend query + queryOptions + page + ListClient — one feature, one commit.
- Comments: default no. Explain non-obvious *WHY* (workaround, invariant, framework quirk). Don't narrate WHAT — code names already do that. `style(repo): trim narrative comments to non-obvious WHY only` is the policy in commit form.
- Seed data: `npm run seed` in backend. Guarded by `NODE_ENV=development` + sentinel-row idempotency. Don't echo passwords in logs.
- Schema changes: `synchronize: true` in dev for fast iteration. Migrations for prod via `npm run migration:generate` / `migration:run`. Schema-altering decorators on entities; never raw SQL outside migrations.

---

## What's intentionally NOT done yet

These are deferred decisions, not oversights:

- **Cursor pagination on field resolvers** (`Project.materials`, `User.projects`). At seeded scale they're fine. The trade is "DataLoader batching" vs "per-key cursor" — when a project gets >100 materials, take the trade.
- **Soft delete** (`@DeleteDateColumn`). Would enable the partial-index pattern (`@Index(..., { where: '"deleted_at" IS NULL' })`) and "trash + restore" UX. Not needed yet.
- **Refresh tokens / `jti` denylist**. README's auth section is honest about this: 7-day access tokens, no revocation. Production-shape addition, not learning-project.
- **Rate limiting on login**. `@nestjs/throttler` is the right tool when adding it.
- **Search indexes** (`pg_trgm` + GIN). At 31 rows the `LIKE '%term%'` is fine; at 100k+ rows you'll need this.
- **Reusing the optimistic mutation pattern via a helper**. Four current consumers is the wrong number — two is too few to abstract, four is starting to feel like it. Wait for the fifth before extracting.

---

## File-level pointers

- Server Actions trust boundary: `frontend/lib/actions/*.actions.ts` — `parseInput` with the shared Zod schema.
- The ValidationPipe trap: `backend/src/main.ts:33-34` + `backend/src/projects/projects.resolver.ts` shows the single-ArgsType resolution.
- Hydration entry: `frontend/lib/get-query-client.ts` + `frontend/app/providers.tsx`.
- Transaction contract: `backend/src/projects/projects.service.ts:createWithMaterials` + spec at `projects.service.spec.ts`.
- E2E test pattern: `backend/test/projects.transaction.e2e-spec.ts`.
- Optimistic mutation pattern: `frontend/lib/mutations/projects.ts:useUpdateProjectStatus` + test at `frontend/lib/mutations/projects.test.ts`.
