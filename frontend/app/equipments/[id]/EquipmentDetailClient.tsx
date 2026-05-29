'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { equipmentByIdQueryOptions } from '../../../lib/queries/equipments';
import {
  useUpdateEquipment,
  useRemoveEquipment,
} from '../../../lib/mutations/equipments';
import { UpdateEquipmentSchema } from '../../../lib/validation/forms';
import { ConfirmDeleteModal } from '../../../components/ConfirmDeleteModal';
import { ManagerSelect } from '../../../components/ManagerSelect';

export function EquipmentDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: equipment } = useQuery(
    equipmentByIdQueryOptions({ id, token: session?.accessToken }),
  );
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const removeMutation = useRemoveEquipment();

  if (!equipment) return null;

  const canEdit =
    session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER';
  const canDelete = session?.user.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/equipments" className="hover:text-gray-900">Equipment</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{equipment.name}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{equipment.name}</h1>
          {equipment.description && (
            <p className="text-gray-500 mt-1">{equipment.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete equipment"
        description={
          <>
            <strong className="text-gray-900">{equipment.name}</strong> will be
            permanently removed.
          </>
        }
        confirmLabel="Delete equipment"
        isDeleting={removeMutation.isPending}
        error={removeMutation.isError ? removeMutation.error.message : null}
        onCancel={() => {
          setDeleteOpen(false);
          removeMutation.reset();
        }}
        onConfirm={async () => {
          await removeMutation.mutateAsync(id);
          router.push('/equipments');
        }}
      />

      {editing ? (
        <EditEquipmentForm
          equipment={equipment}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="card">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Details</h2>
          <dl className="text-sm space-y-2">
            <div className="flex">
              <dt className="w-32 text-gray-500">Manager</dt>
              <dd className="text-gray-900">
                {equipment.manager?.name ?? <span className="text-gray-400">Unassigned</span>}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-gray-500">Created</dt>
              <dd className="text-gray-900">
                {new Date(equipment.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-gray-500">Last updated</dt>
              <dd className="text-gray-900">
                {new Date(equipment.updatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

function EditEquipmentForm({
  equipment,
  onDone,
}: {
  equipment: {
    id: string;
    name: string;
    description?: string | null;
    manager?: { id: string; name: string } | null;
  };
  onDone: () => void;
}) {
  const mutation = useUpdateEquipment();
  const form = useForm({
    defaultValues: {
      id: equipment.id,
      name: equipment.name,
      description: equipment.description ?? '',
      managerId: equipment.manager?.id ?? '',
    },
    validators: { onChange: UpdateEquipmentSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="card space-y-4"
    >
      <h2 className="text-sm font-medium text-gray-700">Edit equipment</h2>

      <form.Field name="name">
        {(field) => (
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div>
            <label className="label">Description</label>
            <textarea
              rows={2}
              className="input resize-none"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="managerId">
        {(field) => (
          <ManagerSelect
            label="Manager"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            currentManagerId={equipment.manager?.id ?? ''}
            currentManagerName={equipment.manager?.name}
          />
        )}
      </form.Field>

      {mutation.isError && (
        <p className="text-sm text-red-600">{mutation.error.message}</p>
      )}

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {isSubmitting || mutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-secondary" onClick={onDone}>
              Cancel
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}

function FieldError({ field }: { field: { state: { meta: { errors: unknown[] } } } }) {
  const err = field.state.meta.errors[0];
  if (!err) return null;
  const msg = typeof err === 'string' ? err : (err as { message?: string }).message;
  return <p className="text-xs text-red-600 mt-1">{msg}</p>;
}
