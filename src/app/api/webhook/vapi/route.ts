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

    // Extract call details from payload root or message nested root
    const call = payload.call || message.call || message.functionCall?.call || null;
    const callId = call?.id || payload.callId || message.callId || '';

    // 1. Handle Function Call / Tool Calls (e.g. create_lead)
    if (message.type === 'tool-calls' || message.type === 'function-call') {
      let toolCallId = '';
      let functionName = '';
      let args: any = {};

      if (message.type === 'tool-calls' && message.toolCalls && message.toolCalls.length > 0) {
        const toolCall = message.toolCalls[0];
        toolCallId = toolCall.id;
        functionName = toolCall.function?.name || '';
        
        const rawArgs = toolCall.function?.arguments;
        if (typeof rawArgs === 'string') {
          try {
            args = JSON.parse(rawArgs);
          } catch (e) {
            console.error('Failed to parse toolCall arguments:', e);
            args = {};
          }
        } else if (rawArgs && typeof rawArgs === 'object') {
          args = rawArgs;
        }
      } else if (message.type === 'function-call' && message.functionCall) {
        toolCallId = message.functionCall.id;
        functionName = message.functionCall.name;
        args = message.functionCall.arguments || {};
      }

      if (functionName === 'create_lead') {
        const { name, phone, email, company, service, budget, meeting_date, status, lead_evaluation } = args;

        if (!name || !phone || !email) {
          return NextResponse.json({
            results: [{
              toolCallId: toolCallId,
              result: 'Missing required parameters: name, phone, or email'
            }]
          }, { status: 200 });
        }

        let finalMeetingDate = meeting_date;
        if (meeting_date) {
          try {
            const parsedDate = new Date(meeting_date);
            if (!isNaN(parsedDate.getTime())) {
              const currentDate = new Date();
              // If Vapi sent a year that is in the past, adjust the year to the current year
              if (parsedDate.getFullYear() < currentDate.getFullYear()) {
                parsedDate.setFullYear(currentDate.getFullYear());
              }
              finalMeetingDate = parsedDate.toISOString();
            }
          } catch (e) {
            console.error('Error normalizing meeting date year:', e);
          }
        }

        // 1. Availability check: check for scheduling conflicts
        if (finalMeetingDate) {
          const availability = await checkMeetingConflict(finalMeetingDate);
          if (availability.conflict) {
            return NextResponse.json({
              results: [{
                toolCallId: toolCallId,
                result: JSON.stringify({
                  status: 'conflict',
                  message: `The requested time slot is already booked. Please politely ask the caller to choose one of these alternative times instead: ${availability.suggestions?.join(', ')}.`,
                  suggestions: availability.suggestions
                })
              }]
            }, { status: 200 }); // Vapi tool returns 200 with result context
          }
        }

        // 2. Save or Update Lead
        let leadId = 'demo-lead-id';
        if (isSupabaseConfigured) {
          let existingLead = null;
          if (callId) {
            const { data } = await supabase
              .from('leads')
              .select('*')
              .eq('vapi_call_id', callId)
              .maybeSingle();
            existingLead = data;
          }

          if (!existingLead && phone) {
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const { data } = await supabase
              .from('leads')
              .select('*')
              .eq('phone', phone)
              .gt('created_at', fifteenMinsAgo)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            existingLead = data;
          }

          const validStatuses = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
          let finalStatus = 'New Lead';
          if (status && validStatuses.includes(status)) {
            finalStatus = status;
          } else if (finalMeetingDate) {
            finalStatus = 'Qualified';
          }

          if (existingLead) {
            const { data: updatedLead, error: updateError } = await supabase
              .from('leads')
              .update({
                name,
                phone,
                email,
                company: company || existingLead.company,
                service: service || existingLead.service,
                budget: budget || existingLead.budget,
                status: finalStatus,
                vapi_call_id: callId || existingLead.vapi_call_id
              })
              .eq('id', existingLead.id)
              .select()
              .single();

            if (updateError) throw updateError;
            if (updatedLead) leadId = updatedLead.id;
            console.log(`Updated existing lead ${leadId} from Vapi call.`);
          } else {
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
                status: finalStatus,
                vapi_call_id: callId || null
              }])
              .select()
              .single();

            if (leadError) throw leadError;
            if (lead) leadId = lead.id;
            console.log(`Created new lead ${leadId} from Vapi call.`);
          }
        }

        // 2.5 Save AI Lead Intent Analysis Note
        if (lead_evaluation && isSupabaseConfigured) {
          const analysisNoteText = `[AI Intent Analysis] ${lead_evaluation}`;
          try {
            const { data: existingNotes } = await supabase
              .from('notes')
              .select('id, note')
              .eq('lead_id', leadId);
              
            const existingAnalysisNote = existingNotes?.find((n: any) => n.note.startsWith('[AI Intent Analysis]'));
            
            if (existingAnalysisNote) {
              await supabase
                .from('notes')
                .update({ note: analysisNoteText })
                .eq('id', existingAnalysisNote.id);
              console.log(`Updated AI Lead Intent Analysis for lead ${leadId}`);
            } else {
              await supabase.from('notes').insert([{
                lead_id: leadId,
                note: analysisNoteText
              }]);
              console.log(`Created new AI Lead Intent Analysis for lead ${leadId}`);
            }
          } catch (err) {
            console.error('Error saving AI Lead Intent Analysis:', err);
          }
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
            meetingDate: finalMeetingDate || undefined
          }
        });

        // 3. Create Google Calendar Appointment & Send Nodemailer Confirmation
        // Generate a realistic Google Meet link format (e.g. meet.google.com/abc-defg-hij)
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * 26)]).join('');
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 26)]).join('');
        const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * 26)]).join('');
        let meetingLink = `https://meet.google.com/${part1}-${part2}-${part3}`;
        if (finalMeetingDate) {
          const calendarEvent = await createCalendarEvent({
            name,
            email,
            service: service || 'AI Agent',
            budget: budget || undefined,
            meetingDate: finalMeetingDate
          });

          meetingLink = calendarEvent.meetingLink;

          if (isSupabaseConfigured) {
            // Check if there is already a scheduled meeting for this lead
            const { data: existingMeeting } = await supabase
              .from('meetings')
              .select('*')
              .eq('lead_id', leadId)
              .eq('status', 'Scheduled')
              .maybeSingle();

            if (existingMeeting) {
              await supabase
                .from('meetings')
                .update({
                  meeting_date: new Date(finalMeetingDate).toISOString(),
                  meeting_link: meetingLink
                })
                .eq('id', existingMeeting.id);
              console.log(`Updated scheduled meeting for lead ${leadId}`);
            } else {
              await supabase
                .from('meetings')
                .insert([{
                  lead_id: leadId,
                  meeting_date: new Date(finalMeetingDate).toISOString(),
                  meeting_link: meetingLink,
                  status: 'Scheduled'
                }]);
              console.log(`Created new scheduled meeting for lead ${leadId}`);
            }
          }

          // Trigger email notification
          await sendConfirmationEmail({
            to: email,
            name,
            service: service || 'AI Agent',
            meetingLink,
            meetingDate: finalMeetingDate
          });
        }

        return NextResponse.json({
          results: [{
            toolCallId: toolCallId,
            result: JSON.stringify({
              status: 'success',
              message: 'Lead saved and consultation meeting scheduled successfully in MorangoAI CRM.',
              lead_id: leadId,
              meeting_link: meetingLink
            })
          }]
        }, { status: 200 });
      }
    }

    // 2. Handle End of Call Report (Transcript and Recording)
    if (message.type === 'end-of-call-report') {
      const customerPhone = call?.customer?.number || payload.customer?.number || '';

      // Extract transcript and recordingUrl from all possible locations, including message.artifact
      const transcriptText = message.transcript || call?.transcript || payload.transcript || message.artifact?.transcript || payload.artifact?.transcript || '';
      const recordingUrlText = message.recordingUrl || message.recording_url || call?.recordingUrl || call?.recording_url || payload.recordingUrl || payload.recording_url || message.artifact?.recordingUrl || message.artifact?.recording_url || payload.artifact?.recordingUrl || payload.artifact?.recording_url || '';

      console.log('Received end-of-call-report event:', {
        callId: callId,
        phone: customerPhone,
        hasTranscript: !!transcriptText,
        hasRecording: !!recordingUrlText
      });

      if (!isSupabaseConfigured) {
        console.log('Received end-of-call-report in demo mode:', { customerPhone, recordingUrlText });
        return NextResponse.json({ success: true, mode: 'demo' }, { status: 200 });
      }

      // 1. Match the Lead ID (either by callId or phone number fallback)
      let matchedLeadId = null;
      if (callId) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .eq('vapi_call_id', callId)
          .maybeSingle();
        if (data) matchedLeadId = data.id;
      }

      if (!matchedLeadId && customerPhone) {
        // Robust phone matching: strip non-digits and compare trailing digits
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
        const lastNine = cleanPhone.slice(-9);
        
        const { data: phoneLeads } = await supabase
          .from('leads')
          .select('id, phone');
          
        if (phoneLeads) {
          const matched = phoneLeads.find(l => {
            const lClean = (l.phone || '').replace(/[^0-9]/g, '');
            return lClean === cleanPhone || (lastNine && lClean.endsWith(lastNine));
          });
          if (matched) matchedLeadId = matched.id;
        }
      }

      if (matchedLeadId) {
        // 2. Update Lead Details (Transcript and Recording URL)
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            transcript: transcriptText || null,
            recording_url: recordingUrlText || null
          })
          .eq('id', matchedLeadId);

        if (updateError) {
          console.error(`Error updating transcript/recording for lead ${matchedLeadId}:`, updateError);
        } else {
          console.log(`Saved transcript and recording URL for lead ${matchedLeadId}`);
        }

        // 3. Save AI Call Summary as a CRM Note
        const summary = payload.summary || call?.analysis?.summary || message.summary || '';
        if (summary) {
          const summaryNoteText = `[Call Summary] ${summary}`;
          try {
            const { data: existingNotes } = await supabase
              .from('notes')
              .select('id, note')
              .eq('lead_id', matchedLeadId);

            const alreadyLogged = existingNotes?.some((n: any) => n.note.startsWith('[Call Summary]'));
            if (!alreadyLogged) {
              await supabase.from('notes').insert([{
                lead_id: matchedLeadId,
                note: summaryNoteText
              }]);
              console.log(`Saved call summary note for lead ${matchedLeadId}`);
            }
          } catch (err) {
            console.error('Error saving call summary note:', err);
          }
        }
      } else {
        console.warn(`Could not match any lead for call ID ${call?.id} or phone ${customerPhone}`);
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ message: 'Unhandled webhook event type' }, { status: 200 });
  } catch (err: any) {
    console.error('Vapi Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
