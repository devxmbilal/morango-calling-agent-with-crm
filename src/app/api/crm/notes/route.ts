import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { dbServer, isServerDbConfigured } from '@/lib/db-server';

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isServerDbConfigured) {
    return NextResponse.json({ error: 'Database is not configured on the server.' }, { status: 503 });
  }

  try {
    const { leadId, note } = await req.json();
    if (!leadId || !note) {
      return NextResponse.json({ error: 'leadId and note are required.' }, { status: 400 });
    }

    const newNote = await dbServer.addNote(leadId, note);
    return NextResponse.json({ note: newNote }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add note.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isServerDbConfigured) {
    return NextResponse.json({ error: 'Database is not configured on the server.' }, { status: 503 });
  }

  try {
    const { noteId, note } = await req.json();
    if (!noteId || !note) {
      return NextResponse.json({ error: 'noteId and note are required.' }, { status: 400 });
    }

    const success = await dbServer.updateNote(noteId, note);
    return NextResponse.json({ success }, { status: success ? 200 : 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update note.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isServerDbConfigured) {
    return NextResponse.json({ error: 'Database is not configured on the server.' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');
    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required.' }, { status: 400 });
    }

    const success = await dbServer.deleteNote(noteId);
    return NextResponse.json({ success }, { status: success ? 200 : 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete note.' }, { status: 500 });
  }
}
