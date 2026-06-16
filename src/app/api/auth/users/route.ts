import { NextResponse } from 'next/server';
import { authService } from '@/lib/auth';
import { verifyJWT } from '@/lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'morango_default_secret_key_12345!';

// Middleware authorization check helper
async function checkAuth(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get('Cookie') || '';
  const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('morango_auth_token='));
  if (!tokenCookie) return false;
  
  const token = tokenCookie.split('=')[1];
  const payload = await verifyJWT(token, JWT_SECRET);
  return !!payload;
}

// GET: List all users
export async function GET(req: Request) {
  try {
    const isAuthed = await checkAuth(req);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const users = await authService.listUsers();
    return NextResponse.json(users, { status: 200 });
  } catch (err: any) {
    console.error('List users error:', err);
    return NextResponse.json({ error: 'Failed to retrieve users.' }, { status: 500 });
  }
}

// POST: Create a new user
export async function POST(req: Request) {
  try {
    const isAuthed = await checkAuth(req);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const newUser = await authService.createUser(username, password);
    return NextResponse.json({
      message: 'User created successfully',
      user: { id: newUser.id, username: newUser.username }
    }, { status: 201 });
  } catch (err: any) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create user.' }, { status: 500 });
  }
}
