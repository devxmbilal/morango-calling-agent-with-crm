import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { dbServer, isServerDbConfigured } from '@/lib/db-server';

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isServerDbConfigured) {
    return NextResponse.json({ inquiries: [], isDemoMode: true }, { status: 200 });
  }

  try {
    const inquiries = await dbServer.getInquiries();
    return NextResponse.json({ inquiries, isDemoMode: false }, { status: 200 });
  } catch (err: any) {
    console.error('CRM getInquiries error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch inquiries.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Inquiry id is required.' }, { status: 400 });
    }

    const success = await dbServer.deleteInquiry(id);
    return NextResponse.json({ success }, { status: success ? 200 : 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete inquiry.' }, { status: 500 });
  }
}
