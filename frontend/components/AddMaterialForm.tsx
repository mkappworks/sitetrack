'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addMaterial } from '../lib/actions/project.actions';

export function AddMaterialForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMaterial(projectId, formData);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        + Add material
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="flex gap-3 flex-wrap items-end">
      <div>
        <label className="label">Material</label>
        <input name="name" required className="input w-40" placeholder="Concrete" />
      </div>
      <div>
        <label className="label">Qty</label>
        <input name="quantity" type="number" step="0.01" required className="input w-24" placeholder="50" />
      </div>
      <div>
        <label className="label">Unit</label>
        <input name="unit" required className="input w-20" placeholder="m³" />
      </div>
      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add'}
      </button>
      <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
