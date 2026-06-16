import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET: Retrieve all leads
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ 
      error: 'Supabase is not configured. Running in demo mode.',
      isDemo: true 
    }, { status: 200 });
  }

  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(leads, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new lead (e.g. from n8n)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, company, service, budget, source, status, vapi_call_id, transcript, recording_url } = body;

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Name, Phone, and Email are required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ 
        message: 'Lead received successfully! (Running in demo mode, not written to DB)',
        data: body,
        isDemo: true
      }, { status: 200 });
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert([{
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
        recording_url: recording_url || null
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: 'Lead created successfully', lead }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
