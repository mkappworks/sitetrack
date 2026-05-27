import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// withAuth wraps Next.js middleware with NextAuth session checking.
// The token callback runs BEFORE the page is rendered — no flash of wrong content.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Protect /admin — redirect non-admins to dashboard
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true if the user should be allowed through, false to redirect to /login
      authorized: ({ token }) => !!token,
    },
  },
);

// Apply middleware to these paths only
// login, api/auth, and _next are excluded automatically
export const config = {
  matcher: ['/dashboard/:path*', '/projects/:path*', '/admin/:path*'],
};
