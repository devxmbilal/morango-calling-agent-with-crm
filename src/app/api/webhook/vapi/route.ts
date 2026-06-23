import { NextResponse } from 'next/server';
import { verifyWebhookSecret } from '@/lib/api-auth';
import { getSupabaseAdmin, isServerDbConfigured } from '@/lib/supabase-admin';
import { checkMeetingConflict, createCalendarEvent } from '@/lib/calendar';
import { sendConfirmationEmail, sendAdminNotificationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    if (!verifyWebhookSecret(req, 'VAPI_WEBHOOK_SECRET', 'x-vapi-secret')) {
      return NextResponse.json({ error: 'Unauthorized webhook.' }, { status: 401 });
    }

    const payload = await req.json();
    const { message } = payload;

    if (!message) {
      return NextResponse.json({ error: 'Invalid Vapi payload' }, { status: 400 });
    }

    const call = payload.call || message.call || message.functionCall?.call || null;
    const callId = call?.id || payload.callId || message.callId || '';

    if (message.type === 'tool-calls' || message.type === 'function-call') {
      let toolCallId = '';
      let functionName = '';
      let args: Record<string, string> = {};

      if (message.type === 'tool-calls' && message.toolCalls?.length > 0) {
        const toolCall = message.toolCalls[0];
        toolCallId = toolCall.id;
        functionName = toolCall.function?.name || '';

        const rawArgs = toolCall.function?.arguments;
        if (typeof rawArgs === 'string') {
          try {
            args = JSON.parse(rawArgs);
          } catch {
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
              toolCallId,
              result: 'Missing required parameters: name, phone, or email',
            }],
          }, { status: 200 });
        }

        let finalMeetingDate = meeting_date;
        if (meeting_date) {
          try {
            const parsedDate = new Date(meeting_date);
            if (!isNaN(parsedDate.getTime())) {
              const currentDate = new Date();
              if (parsedDate.getFullYear() < currentDate.getFullYear()) {
                parsedDate.setFullYear(currentDate.getFullYear());
              }
              finalMeetingDate = parsedDate.toISOString();
            }
          } catch (e) {
            console.error('Error normalizing meeting date year:', e);
          }
        }

        if (finalMeetingDate) {
          const availability = await checkMeetingConflict(finalMeetingDate);
          if (availability.conflict) {
            return NextResponse.json({
              results: [{
                toolCallId,
                result: JSON.stringify({
                  status: 'conflict',
                  message: `The requested time slot is already booked. Please politely ask the caller to choose one of these alternative times instead: ${availability.suggestions?.join(', ')}.`,
                  suggestions: availability.suggestions,
                }),
              }],
            }, { status: 200 });
          }
        }

        let leadId = 'demo-lead-id';
        let meetingLink = '';

        if (isServerDbConfigured) {
          const supabase = getSupabaseAdmin();
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
          let finalStatus: string = 'New Lead';
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
                vapi_call_id: callId || existingLead.vapi_call_id,
              })
              .eq('id', existingLead.id)
              .select()
              .single();

            if (updateError) throw updateError;
            if (updatedLead) leadId = updatedLead.id;
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
                vapi_call_id: callId || null,
              }])
              .select()
              .single();

            if (leadError) throw leadError;
            if (lead) leadId = lead.id;
          }

          if (lead_evaluation) {
            const analysisNoteText = `[AI Intent Analysis] ${lead_evaluation}`;
            const { data: existingNotes } = await supabase
              .from('notes')
              .select('id, note')
              .eq('lead_id', leadId);

            const existingAnalysisNote = existingNotes?.find((n: { note: string }) =>
              n.note.startsWith('[AI Intent Analysis]')
            );

            if (existingAnalysisNote) {
              await supabase.from('notes').update({ note: analysisNoteText }).eq('id', existingAnalysisNote.id);
            } else {
              await supabase.from('notes').insert([{ lead_id: leadId, note: analysisNoteText }]);
            }
          }
        }

        const adminNotificationEmail =
          (isServerDbConfigured ? await getSupabaseAdmin().from('system_settings').select('value').eq('key', 'admin_email').single().then(r => r.data?.value) : null)
          || 'sales@morangoai.com';

        await sendAdminNotificationEmail({
          to: adminNotificationEmail,
          lead: {
            name,
            phone,
            email,
            service: service || 'AI Agent',
            budget: budget || undefined,
            meetingDate: finalMeetingDate || undefined,
          },
        });

        if (finalMeetingDate) {
          const calendarEvent = await createCalendarEvent({
            name,
            email,
            service: service || 'AI Agent',
            budget: budget || undefined,
            meetingDate: finalMeetingDate,
          });

          meetingLink = calendarEvent.meetingLink;

          if (isServerDbConfigured) {
            const supabase = getSupabaseAdmin();
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
                  meeting_link: meetingLink,
                })
                .eq('id', existingMeeting.id);
            } else {
              await supabase.from('meetings').insert([{
                lead_id: leadId,
                meeting_date: new Date(finalMeetingDate).toISOString(),
                meeting_link: meetingLink,
                status: 'Scheduled',
              }]);
            }
          }

          await sendConfirmationEmail({
            to: email,
            name,
            service: service || 'AI Agent',
            meetingLink,
            meetingDate: finalMeetingDate,
          });
        }

        return NextResponse.json({
          results: [{
            toolCallId,
            result: JSON.stringify({
              status: 'success',
              message: 'Lead saved and consultation meeting scheduled successfully in MorangoAI CRM.',
              lead_id: leadId,
              meeting_link: meetingLink || undefined,
            }),
          }],
        }, { status: 200 });
      }
    }

    if (message.type === 'end-of-call-report') {
      const customerPhone = call?.customer?.number || payload.customer?.number || '';
      const transcriptText =
        message.transcript ||
        call?.transcript ||
        payload.transcript ||
        message.artifact?.transcript ||
        payload.artifact?.transcript ||
        '';
      const recordingUrlText =
        message.recordingUrl ||
        message.recording_url ||
        call?.recordingUrl ||
        call?.recording_url ||
        payload.recordingUrl ||
        payload.recording_url ||
        message.artifact?.recordingUrl ||
        message.artifact?.recording_url ||
        payload.artifact?.recordingUrl ||
        payload.artifact?.recording_url ||
        '';

      if (!isServerDbConfigured) {
        return NextResponse.json({ success: true, mode: 'demo' }, { status: 200 });
      }

      const supabase = getSupabaseAdmin();
      let matchedLeadId: string | null = null;

      if (callId) {
        const { data } = await supabase.from('leads').select('id').eq('vapi_call_id', callId).maybeSingle();
        if (data) matchedLeadId = data.id;
      }

      if (!matchedLeadId && customerPhone) {
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
        const lastNine = cleanPhone.slice(-9);
        const { data: phoneLeads } = await supabase.from('leads').select('id, phone');

        const matched = phoneLeads?.find(l => {
          const lClean = (l.phone || '').replace(/[^0-9]/g, '');
          return lClean === cleanPhone || (lastNine && lClean.endsWith(lastNine));
        });
        if (matched) matchedLeadId = matched.id;
      }

      if (matchedLeadId) {
        await supabase
          .from('leads')
          .update({
            transcript: transcriptText || null,
            recording_url: recordingUrlText || null,
          })
          .eq('id', matchedLeadId);

        const summary = payload.summary || call?.analysis?.summary || message.summary || '';
        if (summary) {
          const summaryNoteText = `[Call Summary] ${summary}`;
          const { data: existingNotes } = await supabase
            .from('notes')
            .select('id, note')
            .eq('lead_id', matchedLeadId);

          const alreadyLogged = existingNotes?.some((n: { note: string }) =>
            n.note.startsWith('[Call Summary]')
          );
          if (!alreadyLogged) {
            await supabase.from('notes').insert([{ lead_id: matchedLeadId, note: summaryNoteText }]);
          }
        }
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ message: 'Unhandled webhook event type' }, { status: 200 });
  } catch (err: any) {
    console.error('Vapi Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
