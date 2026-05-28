'use client';

import { ErrorState } from '../../components/ErrorState';

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} title="Projects failed to load" />;
}
