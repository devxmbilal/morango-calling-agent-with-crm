import { NextResponse } from 'next/server';
import { verifyWebhookSecret } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { isServerDbConfigured } from '@/lib/db-server';
import { checkMeetingConflict, createCalendarEvent } from '@/lib/calendar';
import { sendConfirmationEmail, sendAdminNotificationEmail } from '@/lib/email';
import { getTimezone, getTimezoneOffsetString } from '@/lib/db-server';

export async function POST(req: Request) {
  try {
    // Only enforce secret check if VAPI_WEBHOOK_SECRET is explicitly configured
    if (process.env.VAPI_WEBHOOK_SECRET && !verifyWebhookSecret(req, 'VAPI_WEBHOOK_SECRET', 'x-vapi-secret')) {
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
            // If no timezone info in the string, treat as the configured timezone
            const configuredTz = await getTimezone();
            const hasTimezone = meeting_date.endsWith('Z') ||
              meeting_date.includes('+') ||
              meeting_date.toLowerCase().includes('utc');
            const tzOffset = hasTimezone ? '' : getTimezoneOffsetString(configuredTz);
            const dateStr = hasTimezone ? meeting_date : meeting_date + tzOffset;
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              const currentDate = new Date();
              // Fix wrong year
              if (parsedDate.getFullYear() < currentDate.getFullYear()) {
                parsedDate.setFullYear(currentDate.getFullYear());
              }
              // Fix Vapi UTC "tomorrow" bug: Vapi runs in UTC, so when caller says
              // "tomorrow" at e.g. 5PM Dubai time (13:00 UTC), Vapi may resolve the date
              // as "today" in UTC instead of "tomorrow" in Dubai time. If the resolved date
              // falls on the same calendar day as today in Dubai time, shift it forward 1 day.
              const tzNow = new Date(currentDate.toLocaleString('en-US', { timeZone: configuredTz }));
              const tzMeeting = new Date(parsedDate.toLocaleString('en-US', { timeZone: configuredTz }));
              const todayTz = new Date(tzNow.getFullYear(), tzNow.getMonth(), tzNow.getDate());
              const meetingDayTz = new Date(tzMeeting.getFullYear(), tzMeeting.getMonth(), tzMeeting.getDate());
              if (meetingDayTz.getTime() === todayTz.getTime() && tzMeeting.getTime() < tzNow.getTime()) {
                // Meeting time already passed today → shift to same time tomorrow
                parsedDate.setDate(parsedDate.getDate() + 1);
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
          let existingLead = null;

          if (callId) {
            existingLead = await prisma.lead.findFirst({
              where: { vapi_call_id: callId },
            });
          }

          if (!existingLead && phone) {
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
            existingLead = await prisma.lead.findFirst({
              where: {
                phone,
                created_at: {
                  gt: fifteenMinsAgo,
                },
              },
              orderBy: {
                created_at: 'desc',
              },
            });
          }

          const validStatuses = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
          let finalStatus: string = 'New Lead';
          if (status && validStatuses.includes(status)) {
            finalStatus = status;
          } else if (finalMeetingDate) {
            finalStatus = 'Qualified';
          }

          if (existingLead) {
            const updatedLead = await prisma.lead.update({
              where: { id: existingLead.id },
              data: {
                name,
                phone,
                email,
                company: company || existingLead.company,
                service: service || existingLead.service,
                budget: budget || existingLead.budget,
                status: finalStatus,
                vapi_call_id: callId || existingLead.vapi_call_id,
              },
            });
            leadId = updatedLead.id;
          } else {
            const lead = await prisma.lead.create({
              data: {
                name,
                phone,
                email,
                company: company || null,
                service: service || 'AI Agent',
                budget: budget || null,
                source: 'Vapi Call',
                status: finalStatus,
                vapi_call_id: callId || null,
              },
            });
            leadId = lead.id;
          }

          if (lead_evaluation) {
            const analysisNoteText = `[AI Intent Analysis] ${lead_evaluation}`;
            const existingNotes = await prisma.note.findMany({
              where: { lead_id: leadId },
            });

            const existingAnalysisNote = existingNotes?.find((n: { note: string }) =>
              n.note.startsWith('[AI Intent Analysis]')
            );

            if (existingAnalysisNote) {
              await prisma.note.update({
                where: { id: existingAnalysisNote.id },
                data: { note: analysisNoteText },
              });
            } else {
              await prisma.note.create({
                data: { lead_id: leadId, note: analysisNoteText },
              });
            }
          }
        }

        const adminSetting = isServerDbConfigured
          ? await prisma.systemSetting.findUnique({ where: { key: 'admin_email' } })
          : null;
        const adminNotificationEmail = adminSetting?.value || 'no-reply@morangoai.com';

        // Admin notification — non-blocking, failure does not affect lead creation
        sendAdminNotificationEmail({
          to: adminNotificationEmail,
          lead: {
            name,
            phone,
            email,
            service: service || 'AI Agent',
            budget: budget || undefined,
            meetingDate: finalMeetingDate || undefined,
          },
        }).catch((err) => console.error('Admin notification email failed (non-fatal):', err));

        if (finalMeetingDate) {
          // Step 1: Try to create Google Calendar event (non-blocking on failure)
          try {
            const calendarEvent = await createCalendarEvent({
              name,
              email,
              service: service || 'AI Agent',
              budget: budget || undefined,
              meetingDate: finalMeetingDate,
            });
            meetingLink = calendarEvent.meetingLink || '';
          } catch (calendarErr: any) {
            console.error('Google Calendar event creation failed (non-fatal):', calendarErr.message);
          }

          // Step 2: Always save meeting to DB regardless of calendar success
          if (isServerDbConfigured) {
            try {
              const existingMeeting = await prisma.meeting.findFirst({
                where: { lead_id: leadId, status: 'Scheduled' },
              });
              if (existingMeeting) {
                await prisma.meeting.update({
                  where: { id: existingMeeting.id },
                  data: {
                    meeting_date: new Date(finalMeetingDate),
                    meeting_link: meetingLink || null,
                  },
                });
              } else {
                await prisma.meeting.create({
                  data: {
                    lead_id: leadId,
                    meeting_date: new Date(finalMeetingDate),
                    meeting_link: meetingLink || null,
                    status: 'Scheduled',
                  },
                });
              }
            } catch (dbErr: any) {
              console.error('Meeting DB save failed (non-fatal):', dbErr.message);
            }
          }

          // Step 3: Always send confirmation email regardless of calendar/link status
          sendConfirmationEmail({
            to: email,
            name,
            service: service || 'AI Agent',
            meetingLink,
            meetingDate: finalMeetingDate,
          }).catch((err) => console.error('Confirmation email failed (non-fatal):', err));
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

      if (functionName === 'create_inquiry') {
        const { name, phone, call_summary } = args;

        if (!name || !phone) {
          return NextResponse.json({
            results: [{
              toolCallId,
              result: 'Missing required parameters: name or phone',
            }],
          }, { status: 200 });
        }

        let inquiryId = 'demo-inquiry-id';

        if (isServerDbConfigured) {
          let existingInquiry = null;

          if (callId) {
            existingInquiry = await prisma.inquiry.findFirst({
              where: { vapi_call_id: callId },
            });
          }

          if (!existingInquiry && phone) {
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
            existingInquiry = await prisma.inquiry.findFirst({
              where: {
                phone,
                created_at: { gt: fiveMinsAgo },
              },
              orderBy: { created_at: 'desc' },
            });
          }

          if (existingInquiry) {
            await prisma.inquiry.update({
              where: { id: existingInquiry.id },
              data: {
                name,
                phone,
                call_summary: call_summary || existingInquiry.call_summary,
                vapi_call_id: callId || existingInquiry.vapi_call_id,
              },
            });
            inquiryId = existingInquiry.id;
          } else {
            const inquiry = await prisma.inquiry.create({
              data: {
                name,
                phone,
                call_summary: call_summary || null,
                call_status: 'Completed',
                source: 'Vapi Call',
                vapi_call_id: callId || null,
              },
            });
            inquiryId = inquiry.id;
          }
        }

        return NextResponse.json({
          results: [{
            toolCallId,
            result: JSON.stringify({
              status: 'success',
              message: 'Inquiry recorded successfully in MorangoAI CRM.',
              inquiry_id: inquiryId,
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

      let matchedLeadId: string | null = null;

      if (callId) {
        const lead = await prisma.lead.findFirst({
          where: { vapi_call_id: callId },
          select: { id: true },
        });
        if (lead) matchedLeadId = lead.id;
      }

      if (!matchedLeadId && customerPhone) {
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
        const lastNine = cleanPhone.slice(-9);
        const phoneLeads = await prisma.lead.findMany({
          select: { id: true, phone: true },
        });

        const matched = phoneLeads?.find((l: any) => {
          const lClean = (l.phone || '').replace(/[^0-9]/g, '');
          return lClean === cleanPhone || (lastNine && lClean.endsWith(lastNine));
        });
        if (matched) matchedLeadId = matched.id;
      }

      if (matchedLeadId) {
        await prisma.lead.update({
          where: { id: matchedLeadId },
          data: {
            transcript: transcriptText || null,
            recording_url: recordingUrlText || null,
          },
        });

        const summary = payload.summary || call?.analysis?.summary || message.summary || '';
        if (summary) {
          const summaryNoteText = `[Call Summary] ${summary}`;
          const existingNotes = await prisma.note.findMany({
            where: { lead_id: matchedLeadId },
            select: { id: true, note: true },
          });

          const alreadyLogged = existingNotes?.some((n: { note: string }) =>
            n.note.startsWith('[Call Summary]')
          );
          if (!alreadyLogged) {
            await prisma.note.create({
              data: { lead_id: matchedLeadId, note: summaryNoteText },
            });
          }
        }
      } else {
        // Try matching against inquiries table
        let matchedInquiryId: string | null = null;

        if (callId) {
          const inquiry = await prisma.inquiry.findFirst({
            where: { vapi_call_id: callId },
            select: { id: true },
          });
          if (inquiry) matchedInquiryId = inquiry.id;
        }

        if (!matchedInquiryId && customerPhone) {
          const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
          const lastNine = cleanPhone.slice(-9);
          const phoneInquiries = await prisma.inquiry.findMany({
            select: { id: true, phone: true },
          });

          const matched = phoneInquiries?.find((inq: any) => {
            const iClean = (inq.phone || '').replace(/[^0-9]/g, '');
            return iClean === cleanPhone || (lastNine && iClean.endsWith(lastNine));
          });
          if (matched) matchedInquiryId = matched.id;
        }

        if (matchedInquiryId) {
          await prisma.inquiry.update({
            where: { id: matchedInquiryId },
            data: {
              transcript: transcriptText || null,
              recording_url: recordingUrlText || null,
            },
          });
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
