import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing.');
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define public paths to skip checking (static, images, webhooks)
  const isStatic = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') || 
    pathname === '/favicon.ico' || 
    pathname === '/morango_logo.jpg';
    
  const isAuthApi = pathname.startsWith('/api/auth');
  const isWebhookApi = pathname.startsWith('/api/webhook') || pathname === '/api/leads';
  const isLoginPage = pathname === '/login';

  // If static asset or public webhook, allow access
  if (isStatic || isWebhookApi) {
    return NextResponse.next();
  }

  // 2. Extract authorization token cookie
  const token = request.cookies.get('morango_auth_token')?.value;

  // 3. Verify JWT token
  let decoded = null;
  if (token) {
    decoded = await verifyJWT(token, JWT_SECRET);
  }

  // 4. Gating redirects
  if (isLoginPage) {
    if (decoded) {
      // User is already logged in, redirect to dashboard
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (isAuthApi) {
    // Let auth API routes handle their own auth checks
    return NextResponse.next();
  }

  if (!decoded) {
    // User is not authenticated, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Next.js proxy config matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (unless it is auth-related or dashboard calls)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
