import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { message } = payload;

    if (!message) {
      return NextResponse.json({ error: 'Invalid Vapi payload' }, { status: 400 });
    }

    // 1. Handle Function Call (e.g. create_lead)
    if (message.type === 'function-call') {
      const { name: functionName, call, arguments: args } = message.functionCall;

      if (functionName === 'create_lead') {
        const { name, phone, email, company, service, budget, meeting_date } = args;

        if (!name || !phone || !email) {
          return NextResponse.json({
            results: [{
              toolCallId: message.functionCall.id,
              error: 'Missing required parameters: name, phone, or email'
            }]
          }, { status: 200 }); // Vapi expects 200 even on parameter error
        }

        if (!isSupabaseConfigured) {
          return NextResponse.json({
            results: [{
              toolCallId: message.functionCall.id,
              result: {
                message: 'Lead received successfully in Demo Mode!',
                lead_details: args
              }
            }]
          }, { status: 200 });
        }

        // Save Lead to Supabase
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert([{
            name,
            phone,
            email,
            company: company || null,
            service: service || 'AI Agent',
            budget: budget || null,
            source: 'Vapi Call',
            status: 'New Lead',
            vapi_call_id: call?.id || null
          }])
          .select()
          .single();

        if (leadError) throw leadError;

        // If meeting date is supplied, create the meeting
        if (meeting_date && lead) {
          await supabase
            .from('meetings')
            .insert([{
              lead_id: lead.id,
              meeting_date: new Date(meeting_date).toISOString(),
              meeting_link: 'https://meet.google.com/mock-vapi-meeting',
              status: 'Scheduled'
            }]);
        }

        return NextResponse.json({
          results: [{
            toolCallId: message.functionCall.id,
            result: {
              status: 'success',
              message: 'Lead created successfully inside MorangoAI CRM.',
              lead_id: lead?.id
            }
          }]
        }, { status: 200 });
      }
    }

    // 2. Handle End of Call Report (Transcript and Recording)
    if (message.type === 'end-of-call-report') {
      const { call, transcript, recordingUrl } = message;
      const customerPhone = call?.customer?.number;

      if (!isSupabaseConfigured) {
        console.log('Received end-of-call-report in demo mode:', { customerPhone, recordingUrl });
        return NextResponse.json({ success: true, mode: 'demo' }, { status: 200 });
      }

      // Update lead transcript and recording URL
      // We match by vapi_call_id first, then by customer phone as fallback
      let updateQuery = supabase.from('leads').update({
        transcript: transcript || null,
        recording_url: recordingUrl || null
      });

      if (call?.id) {
        const { data } = await updateQuery.eq('vapi_call_id', call.id).select();
        if (data && data.length > 0) {
          return NextResponse.json({ success: true, message: 'Updated by call ID' }, { status: 200 });
        }
      }

      if (customerPhone) {
        await supabase
          .from('leads')
          .update({
            transcript: transcript || null,
            recording_url: recordingUrl || null
          })
          .eq('phone', customerPhone);
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ message: 'Unhandled webhook event type' }, { status: 200 });
  } catch (err: any) {
    console.error('Vapi Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
