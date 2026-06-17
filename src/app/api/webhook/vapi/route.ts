import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkMeetingConflict, createCalendarEvent } from '@/lib/calendar';
import { sendConfirmationEmail, sendAdminNotificationEmail } from '@/lib/email';
import { startReminderScheduler } from '@/lib/scheduler';

export async function POST(req: Request) {
  try {
    // Guarantee scheduler is running
    startReminderScheduler();

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
          }, { status: 200 });
        }

        // 1. Availability check: check for scheduling conflicts
        if (meeting_date) {
          const availability = await checkMeetingConflict(meeting_date);
          if (availability.conflict) {
            return NextResponse.json({
              results: [{
                toolCallId: message.functionCall.id,
                result: {
                  status: 'conflict',
                  message: `The requested time slot is already booked. Please politely ask the caller to choose one of these alternative times instead: ${availability.suggestions?.join(', ')}.`,
                  suggestions: availability.suggestions
                }
              }]
            }, { status: 200 }); // Vapi tool returns 200 with result context
          }
        }

        // 2. Save Lead
        let leadId = 'demo-lead-id';
        if (isSupabaseConfigured) {
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
          if (lead) leadId = lead.id;
        }

        // Fetch admin email dynamically to trigger notification
        let adminNotificationEmail = 'sales@morangoai.com';
        try {
          if (isSupabaseConfigured) {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'admin_email').single();
            if (data && data.value) {
              adminNotificationEmail = data.value;
            }
          } else {
            const fs = require('fs');
            const path = require('path');
            const MOCK_SETTINGS_FILE = path.join(process.cwd(), 'src/lib/mock_settings.json');
            if (fs.existsSync(MOCK_SETTINGS_FILE)) {
              const mockData = JSON.parse(fs.readFileSync(MOCK_SETTINGS_FILE, 'utf-8'));
              if (mockData.admin_email) {
                adminNotificationEmail = mockData.admin_email;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching admin email setting:', err);
        }

        // Trigger admin alert email
        await sendAdminNotificationEmail({
          to: adminNotificationEmail,
          lead: {
            name,
            phone,
            email,
            service: service || 'AI Agent',
            budget: budget || undefined,
            meetingDate: meeting_date || undefined
          }
        });

        // 3. Create Google Calendar Appointment & Send Nodemailer Confirmation
        // Generate a realistic Google Meet link format (e.g. meet.google.com/abc-defg-hij)
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * 26)]).join('');
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 26)]).join('');
        const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * 26)]).join('');
        let meetingLink = `https://meet.google.com/${part1}-${part2}-${part3}`;
        if (meeting_date) {
          const calendarEvent = await createCalendarEvent({
            name,
            email,
            service: service || 'AI Agent',
            budget: budget || undefined,
            meetingDate: meeting_date
          });

          meetingLink = calendarEvent.meetingLink;

          if (isSupabaseConfigured) {
            await supabase
              .from('meetings')
              .insert([{
                lead_id: leadId,
                meeting_date: new Date(meeting_date).toISOString(),
                meeting_link: meetingLink,
                status: 'Scheduled'
              }]);
          }

          // Trigger email notification
          await sendConfirmationEmail({
            to: email,
            name,
            service: service || 'AI Agent',
            meetingLink,
            meetingDate: meeting_date
          });
        }

        return NextResponse.json({
          results: [{
            toolCallId: message.functionCall.id,
            result: {
              status: 'success',
              message: 'Lead saved and consultation meeting scheduled successfully in MorangoAI CRM.',
              lead_id: leadId,
              meeting_link: meetingLink
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
