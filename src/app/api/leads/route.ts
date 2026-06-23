import { NextResponse } from 'next/server';
import { verifyApiKey, requireAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { isServerDbConfigured } from '@/lib/db-server';

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isServerDbConfigured) {
    return NextResponse.json({
      error: 'Database is not configured. Running in demo mode.',
      isDemo: true,
    }, { status: 200 });
  }

  try {
    const leads = await prisma.lead.findMany({
      orderBy: { created_at: 'desc' },
    });
    const mapped = leads.map((l: any) => ({
      ...l,
      created_at: l.created_at.toISOString(),
    }));
    return NextResponse.json(mapped, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!verifyApiKey(req, 'LEADS_API_KEY')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      company,
      service,
      budget,
      source,
      status,
      vapi_call_id,
      transcript,
      recording_url,
    } = body;

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Name, Phone, and Email are required.' }, { status: 400 });
    }

    if (!isServerDbConfigured) {
      return NextResponse.json({
        message: 'Lead received successfully! (Running in demo mode, not written to DB)',
        data: body,
        isDemo: true,
      }, { status: 200 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        email,
        company: company || null,
        service: service || 'AI Agent',
        budget: budget || null,
        source: source || 'Webhook',
        status: status || 'New Lead',
        vapi_call_id: vapi_call_id || null,
        transcript: transcript || null,
        recording_url: recording_url || null,
      }
    });

    const mapped = {
      ...lead,
      created_at: lead.created_at.toISOString(),
    };

    return NextResponse.json({ message: 'Lead created successfully', lead: mapped }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
