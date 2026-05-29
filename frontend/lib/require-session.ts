import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';

// Server-side auth gate for pages/layouts that fetch with the access token.
// Redirects to /login when the stored credentials can't authenticate an API
// call:
//   - no session at all
//   - session.error (the jwt callback's refresh failed —
//     RefreshAccessTokenError — so the access token is stale and unrenewable)
//   - no access token on the session
// Without this, a server-side gqlFetch would throw "Unauthorized" straight
// into the route's error boundary. The client-side 401 retry can't help here:
// a Server Component render can't rotate + persist the cookie.
export async function requireAuthedSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.error || !session.accessToken) {
    // ?expired=1 tells the login page to clear the dead cookie up front
    // (it can't be cleared from an RSC render) and show an "expired" notice.
    redirect('/login?expired=1');
  }
  return session;
}
