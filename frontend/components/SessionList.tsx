'use client';

import type { Session } from '../lib/graphql/schemas';

// Tiny, dependency-free UA summarizer. Not exhaustive — just enough to turn
// a raw user-agent into "Chrome on macOS" for the device list. Falls back to
// the raw string when it can't tell.
function describeDevice(ua: string | null | undefined): string {
  if (!ua) return 'Unknown device';
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : null;
  const os =
    /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : null;
  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return ua.length > 40 ? `${ua.slice(0, 40)}…` : ua;
}

interface Props {
  sessions: Session[];
  // Returns once the revoke completes; the parent owns invalidation.
  onRevoke: (id: string) => void;
  revokingId?: string | null;
  // When true (self-service), the current device shows a badge and its
  // revoke button is suppressed — "Sign out" is the right control for the
  // device you're on. In the admin view there is no current device.
  highlightCurrent?: boolean;
  emptyCopy?: string;
}

export function SessionList({
  sessions,
  onRevoke,
  revokingId,
  highlightCurrent = false,
  emptyCopy = 'No active sessions.',
}: Props) {
  if (sessions.length === 0) {
    return <p className="text-sm text-gray-400">{emptyCopy}</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {sessions.map((s) => (
        <li key={s.id} className="py-3 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900 flex items-center gap-2">
              {describeDevice(s.userAgent)}
              {highlightCurrent && s.current && (
                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  This device
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {s.ipAddress ?? 'unknown IP'}
              {' · signed in '}
              {new Date(s.createdAt).toLocaleString()}
            </p>
          </div>
          {highlightCurrent && s.current ? (
            <span className="text-xs text-gray-300">current</span>
          ) : (
            <button
              onClick={() => onRevoke(s.id)}
              disabled={revokingId === s.id}
              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40"
            >
              {revokingId === s.id ? 'Revoking…' : 'Revoke'}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
