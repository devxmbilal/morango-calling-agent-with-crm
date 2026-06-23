import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getJwtSecret } from '@/lib/env';

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/webhook/vapi',
  '/api/cron/reminders',
];

function isPublicApi(pathname: string, method: string): boolean {
  if (PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return true;
  }
  if (pathname === '/api/leads' && method === 'POST') {
    return true;
  }
  return false;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const isStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/morango_logo.jpg';

  const isLoginPage = pathname === '/login';

  if (isStatic) {
    return NextResponse.next();
  }

  let decoded = null;
  const token = request.cookies.get('morango_auth_token')?.value;
  if (token) {
    try {
      decoded = await verifyJWT(token, getJwtSecret());
    } catch {
      decoded = null;
    }
  }

  if (isPublicApi(pathname, method)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isLoginPage) {
    if (decoded) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!decoded) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
