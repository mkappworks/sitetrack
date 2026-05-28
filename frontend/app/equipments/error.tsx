'use client';

import { ErrorState } from '../../components/ErrorState';

export default function EquipmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} title="Equipment failed to load" />;
}
