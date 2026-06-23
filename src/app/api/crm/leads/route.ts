import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { dbServer, isServerDbConfigured } from '@/lib/db-server';
import type { Lead } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isServerDbConfigured) {
    return NextResponse.json({ leads: [], isDemoMode: true }, { status: 200 });
  }

  try {
    const leads = await dbServer.getLeads();
    return NextResponse.json({ leads, isDemoMode: false }, { status: 200 });
  } catch (err: any) {
    console.error('CRM getLeads error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch leads.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isServerDbConfigured) {
    return NextResponse.json({ error: 'Database is not configured on the server.' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const lead = await dbServer.createLead(body as Omit<Lead, 'id' | 'created_at' | 'meetings' | 'notes'>);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create lead.' }, { status: 500 });
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
    const body = await req.json();
    const { id, status, ...fields } = body;
    if (!id) {
      return NextResponse.json({ error: 'Lead id is required.' }, { status: 400 });
    }

    const success = status
      ? await dbServer.updateLeadStatus(id, status)
      : await dbServer.updateLead(id, fields);

    return NextResponse.json({ success }, { status: success ? 200 : 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update lead.' }, { status: 500 });
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
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Lead id is required.' }, { status: 400 });
    }

    const success = await dbServer.deleteLead(id);
    return NextResponse.json({ success }, { status: success ? 200 : 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete lead.' }, { status: 500 });
  }
}
