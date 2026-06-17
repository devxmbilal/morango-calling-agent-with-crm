import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { authService } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'morango_default_secret_key_12345!';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('Cookie') || '';
    const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('morango_auth_token='));
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];
    const payload = await verifyJWT(token, JWT_SECRET);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
    }

    const user = await authService.getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name || ''
    }, { status: 200 });
  } catch (err: any) {
    console.error('Session error:', err);
    return NextResponse.json({ error: 'Failed to retrieve session.' }, { status: 500 });
  }
}
