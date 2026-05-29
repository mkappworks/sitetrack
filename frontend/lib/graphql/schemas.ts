import { z } from 'zod';

const PaginatedShape = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  });

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

// materials and materialCount are both optional: list view selects only
// materialCount, detail view selects only materials.
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
  deletedAt: z.string().nullable().optional(),
  manager: ManagerSchema.nullable().optional(),
  materials: z.array(MaterialSchema).optional(),
  materialCount: z.number().int().nonnegative().optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: UserRole,
  createdAt: z.string(),
});

export const EquipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
  manager: ManagerSchema.nullable().optional(),
});

export const ProjectsResponseSchema = z.object({
  projects: PaginatedShape(ProjectSchema),
});

export const UsersResponseSchema = z.object({
  users: PaginatedShape(UserSchema),
});

export const ManagersResponseSchema = z.object({
  managers: z.array(ManagerSchema),
});

export const EquipmentsResponseSchema = z.object({
  equipments: PaginatedShape(EquipmentSchema),
});

export const EquipmentByIdResponseSchema = z.object({
  equipment: EquipmentSchema,
});

export const DeletedProjectsResponseSchema = z.object({
  deletedProjects: z.array(ProjectSchema),
});

export const DeletedEquipmentsResponseSchema = z.object({
  deletedEquipments: z.array(EquipmentSchema),
});

export const ProjectByIdResponseSchema = z.object({
  project: ProjectSchema,
});

export const ProjectStatusCountSchema = z.object({
  status: ProjectStatus,
  count: z.number().int().nonnegative(),
});

export const ProjectStatusCountsResponseSchema = z.object({
  projectStatusCounts: z.array(ProjectStatusCountSchema),
});

export const SessionSchema = z.object({
  id: z.string(),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  createdAt: z.string(),
  expiresAt: z.string(),
  current: z.boolean(),
});

export const MySessionsResponseSchema = z.object({
  mySessions: z.array(SessionSchema),
});

export const UserSessionsResponseSchema = z.object({
  userSessions: z.array(SessionSchema),
});

export const UserByIdResponseSchema = z.object({
  user: UserSchema,
});

// action is kept as a plain string (not a z.enum) so a new backend
// AuditAction value never fails wire validation — the UI formats whatever
// it receives.
export const AuditLogEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  actorId: z.string().nullable().optional(),
  actorEmail: z.string().nullable().optional(),
  targetType: z.string().nullable().optional(),
  targetId: z.string().nullable().optional(),
  targetLabel: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const AuditLogResponseSchema = z.object({
  auditLog: PaginatedShape(AuditLogEntrySchema),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Manager = z.infer<typeof ManagerSchema>;
export type Material = z.infer<typeof MaterialSchema>;
export type User = z.infer<typeof UserSchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;
export type ProjectsResponse = z.infer<typeof ProjectsResponseSchema>;
export type UsersResponse = z.infer<typeof UsersResponseSchema>;
export type EquipmentsResponse = z.infer<typeof EquipmentsResponseSchema>;
export type ProjectStatusCount = z.infer<typeof ProjectStatusCountSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
