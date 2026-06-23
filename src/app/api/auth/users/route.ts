import { NextResponse } from 'next/server';
import { authService } from '@/lib/auth';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const users = await authService.listUsers();
    return NextResponse.json(users, { status: 200 });
  } catch (err: any) {
    console.error('List users error:', err);
    return NextResponse.json({ error: 'Failed to retrieve users.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { username, password, name } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const newUser = await authService.createUser(username, password, name);
    return NextResponse.json({
      message: 'User created successfully',
      user: { id: newUser.id, username: newUser.username, name: newUser.name },
    }, { status: 201 });
  } catch (err: any) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create user.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { userId, username, name, password } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required for updates.' }, { status: 400 });
    }

    if (password && password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const updatedUser = await authService.updateUser(userId, {
      username,
      name,
      password: password || undefined,
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: { id: updatedUser.id, username: updatedUser.username, name: updatedUser.name },
    }, { status: 200 });
  } catch (err: any) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required for deletion.' }, { status: 400 });
    }

    if (auth.userId === userId) {
      return NextResponse.json({ error: 'You cannot delete your own active user account.' }, { status: 400 });
    }

    const success = await authService.deleteUser(userId);
    if (!success) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (err: any) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete user.' }, { status: 500 });
  }
}
