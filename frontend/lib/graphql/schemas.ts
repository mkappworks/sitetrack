import { z } from 'zod';

// Zod schemas mirror the backend GraphQL types. We validate the response at the
// trust boundary (right after the network call) so the rest of the app works
// with parsed, fully-typed data — no `any`, no surprises from schema drift.

// ── Reusable ──────────────────────────────────────────────────────────────
const PaginatedShape = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  });

// ── Enums (match backend GraphQL enums exactly) ───────────────────────────
const UserRole = z.enum(['ADMIN', 'MANAGER', 'VIEWER']);
const ProjectStatus = z.enum([
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);
const MaterialStatus = z.enum([
  'ORDERED',
  'IN_TRANSIT',
  'ON_SITE',
  'USED',
  'RETURNED',
]);

// ── Entities ──────────────────────────────────────────────────────────────
export const ManagerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
});

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  status: MaterialStatus,
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: ProjectStatus,
  location: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  manager: ManagerSchema.nullable().optional(),
  materials: z.array(MaterialSchema).optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: UserRole,
  createdAt: z.string(),
});

// ── Paginated responses ───────────────────────────────────────────────────
export const ProjectsResponseSchema = z.object({
  projects: PaginatedShape(ProjectSchema),
});

export const UsersResponseSchema = z.object({
  users: PaginatedShape(UserSchema),
});

// ── Inferred TS types — consumed by Client Components ─────────────────────
export type Project = z.infer<typeof ProjectSchema>;
export type Manager = z.infer<typeof ManagerSchema>;
export type Material = z.infer<typeof MaterialSchema>;
export type User = z.infer<typeof UserSchema>;
export type ProjectsResponse = z.infer<typeof ProjectsResponseSchema>;
export type UsersResponse = z.infer<typeof UsersResponseSchema>;
