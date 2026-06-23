import { NextResponse } from 'next/server';
import { authService } from '@/lib/auth';
import { signJWT } from '@/lib/jwt';
import { getJwtSecret } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const user = await authService.verifyUser(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const token = await signJWT(
      { userId: user.id, username: user.username },
      getJwtSecret(),
      86400
    );

    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username },
    }, { status: 200 });

    const securePart = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.headers.append(
      'Set-Cookie',
      `morango_auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${securePart}`
    );

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
