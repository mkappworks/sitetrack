'use client';

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  isDeleting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  isDeleting = false,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the safe action on open so Enter doesn't accidentally confirm.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Escape closes (unless mid-delete).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isDeleting, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={isDeleting ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 text-lg">
              !
            </div>
            <div className="flex-1">
              <h2 id="confirm-delete-title" className="text-base font-semibold text-gray-900">
                {title}
              </h2>
              {description && (
                <div className="text-sm text-gray-500 mt-1">{description}</div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-3 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="text-sm px-3 py-1.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
