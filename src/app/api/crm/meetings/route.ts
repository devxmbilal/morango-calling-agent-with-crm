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
    const { leadId, meetingDate, meetingLink } = await req.json();
    if (!leadId || !meetingDate) {
      return NextResponse.json({ error: 'leadId and meetingDate are required.' }, { status: 400 });
    }

    const meeting = await dbServer.addMeeting(leadId, meetingDate, meetingLink);
    return NextResponse.json({ meeting }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add meeting.' }, { status: 500 });
  }
}
