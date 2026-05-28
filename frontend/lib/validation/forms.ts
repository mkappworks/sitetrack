import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['MANAGER', 'VIEWER'], {
    error: 'Role must be MANAGER or VIEWER',
  }),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const AddMaterialSchema = z.object({
  name: z.string().trim().min(1, 'Material name is required'),
  quantity: z.number({ error: 'Quantity must be a number' })
    .positive('Quantity must be greater than zero'),
  unit: z.string().trim().min(1, 'Unit is required (e.g. m³, kg)'),
});
export type AddMaterialInput = z.infer<typeof AddMaterialSchema>;

export const UpdateMaterialQuantitySchema = z.object({
  quantity: z.number({ error: 'Quantity must be a number' })
    .positive('Quantity must be greater than zero'),
});
export type UpdateMaterialQuantityInput = z.infer<typeof UpdateMaterialQuantitySchema>;

export const ProjectStatusEnum = z.enum([
  'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED',
]);
export const MaterialStatusEnum = z.enum([
  'ORDERED', 'IN_TRANSIT', 'ON_SITE', 'USED', 'RETURNED',
]);

// Empty-string-allowed (non-optional) keeps TanStack Form's Standard Schema
// interop happy; project.actions strips '' to undefined before the wire.
export const CreateProjectSchema = z.object({
  name: z.string().trim().min(3, 'Project name must be at least 3 characters'),
  description: z.string().trim(),
  location: z.string().trim(),
  status: ProjectStatusEnum,
});
export type CreateProjectFormInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectStatusSchema = z.object({
  id: z.uuid('Invalid project id'),
  status: ProjectStatusEnum,
});
export type UpdateProjectStatusInput = z.infer<typeof UpdateProjectStatusSchema>;

export const UpdateMaterialStatusSchema = z.object({
  id: z.uuid('Invalid material id'),
  status: MaterialStatusEnum,
});
export type UpdateMaterialStatusInput = z.infer<typeof UpdateMaterialStatusSchema>;

export const UpdateMaterialQuantityWithIdSchema = UpdateMaterialQuantitySchema.extend({
  id: z.uuid('Invalid material id'),
});
export type UpdateMaterialQuantityWithIdInput = z.infer<typeof UpdateMaterialQuantityWithIdSchema>;

export const AddMaterialWithProjectSchema = AddMaterialSchema.extend({
  projectId: z.uuid('Invalid project id'),
});
export type AddMaterialWithProjectInput = z.infer<typeof AddMaterialWithProjectSchema>;

const ProjectMaterialItemSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  quantity: z.number().positive('Must be > 0'),
  unit: z.string().trim().min(1, 'Required'),
});

export const CreateProjectWithMaterialsSchema = z.object({
  name: z.string().trim().min(3, 'Project name must be at least 3 characters'),
  description: z.string().trim(),
  location: z.string().trim(),
  status: ProjectStatusEnum,
  materials: z.array(ProjectMaterialItemSchema)
    .min(1, 'Add at least one material'),
});
export type CreateProjectWithMaterialsInput = z.infer<typeof CreateProjectWithMaterialsSchema>;
export type ProjectMaterialItem = z.infer<typeof ProjectMaterialItemSchema>;
