import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { authService } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const user = await authService.getUserById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name || '',
    }, { status: 200 });
  } catch (err: any) {
    console.error('Session error:', err);
    return NextResponse.json({ error: 'Failed to retrieve session.' }, { status: 500 });
  }
}
