'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createProject } from '../lib/actions/project.actions';

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createProject(formData);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + New project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-4">New project</h2>
        {/* action= calls the Server Action directly — no API route needed */}
        <form action={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Project name *</label>
            <input name="name" required className="input" placeholder="Warehouse Extension Phase 2" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="label">Location</label>
            <input name="location" className="input" placeholder="Frankfurt, Germany" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input">
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create project'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
