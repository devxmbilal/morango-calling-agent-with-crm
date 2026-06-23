import { google } from 'googleapis';
import { isServerDbConfigured } from './db-server';
import { dbServer } from './db-server';
import { isPlaceholderMeetingLink } from './meeting-link';

// Extract keys from environment
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '')
  .replace(/^["']|["']$/g, '') // strip wrapping double/single quotes
  .replace(/\\n/g, '\n');
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

const isGoogleCalendarConfigured = 
  SERVICE_ACCOUNT_EMAIL.trim() !== '' && 
  PRIVATE_KEY.trim() !== '';

// Initialize Google Calendar API client using JWT authentication
function getCalendarClient() {
  if (!isGoogleCalendarConfigured) return null;

  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  return google.calendar({ version: 'v3', auth });
}

/**
 * Checks if a requested meeting date/time overlaps with any scheduled meetings in the database.
 * If a conflict is found, generates 3 alternate free slots.
 */
export async function checkMeetingConflict(
  requestedDateStr: string
): Promise<{ conflict: boolean; suggestions?: string[] }> {
  try {
    const requestedDate = new Date(requestedDateStr);
    if (isNaN(requestedDate.getTime())) {
      return { conflict: false }; // Invalid date fallback
    }

    // A meeting occupies a 30-minute slot.
    // There is a conflict if another meeting is scheduled within ±29 minutes of the requested start time.

    let scheduledMeetings: { meeting_date: string }[] = [];

    if (isServerDbConfigured) {
      const leads = await dbServer.getLeads();
      scheduledMeetings = leads.flatMap(lead =>
        (lead.meetings || [])
          .filter(m => m.status === 'Scheduled')
          .filter(m => {
            const mTime = new Date(m.meeting_date).getTime();
            const rTime = requestedDate.getTime();
            return Math.abs(mTime - rTime) < 29 * 60 * 1000;
          })
          .map(m => ({ meeting_date: m.meeting_date }))
      );
    }

    if (scheduledMeetings.length === 0) {
      return { conflict: false };
    }

    // Generate alternate slot suggestions (starting from +30 minutes in increments of 30m)
    const suggestions: string[] = [];
    let testOffsetMinutes = 30;

    // Fetch all existing scheduled meetings to check suggestions against
    let allScheduledMeetings: Date[] = [];
    if (isServerDbConfigured) {
      const leads = await dbServer.getLeads();
      allScheduledMeetings = leads.flatMap(lead =>
        (lead.meetings || [])
          .filter(m => m.status === 'Scheduled')
          .map(m => new Date(m.meeting_date))
      );
    }

    while (suggestions.length < 3 && testOffsetMinutes < 1440) { // Limit to 24 hours search
      const potentialDate = new Date(requestedDate.getTime() + testOffsetMinutes * 60 * 1000);
      
      // Don't suggest slots outside working hours (8 AM to 9 PM client local time, e.g. UTC/Local)
      const hour = potentialDate.getHours();
      if (hour < 8 || hour >= 21) {
        // Skip night hours, move to next day 8 AM
        potentialDate.setHours(8, 0, 0, 0);
        if (potentialDate.getTime() <= requestedDate.getTime() + testOffsetMinutes * 60 * 1000) {
          potentialDate.setDate(potentialDate.getDate() + 1);
        }
        testOffsetMinutes = Math.round((potentialDate.getTime() - requestedDate.getTime()) / (60 * 1000));
        continue;
      }

      // Check if this potential date has a collision
      const hasCollision = allScheduledMeetings.some(scheduledDate => {
        return Math.abs(scheduledDate.getTime() - potentialDate.getTime()) < 29 * 60 * 1000;
      });

      if (!hasCollision) {
        const readableTime = potentialDate.toLocaleString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        suggestions.push(readableTime);
      }

      testOffsetMinutes += 30; // Move to next 30 min slot
    }

    return { conflict: true, suggestions };
  } catch (err) {
    console.error('Error checking meeting conflict:', err);
    return { conflict: false };
  }
}

/**
 * Creates an event in Google Calendar with Google Meet enabled.
 * Returns the meeting link, start time, and Google Calendar event ID.
 */
export async function createCalendarEvent(args: {
  name: string;
  email: string;
  service: string;
  budget?: string;
  meetingDate: string;
}): Promise<{ meetingLink: string; startTime: string; eventId: string }> {
  // Load dynamic meeting link fallback (from database settings or local config)
  let fallbackMeetingLink = '';
  try {
    if (isServerDbConfigured) {
      fallbackMeetingLink = (await dbServer.getSetting('meeting_link')) || '';
    }
  } catch (err) {
    console.error('Error fetching fallback meeting link:', err);
  }

  const eventDate = new Date(args.meetingDate);
  const endEventDate = new Date(eventDate.getTime() + 30 * 60 * 1000); // 30 mins slot

  const calendar = getCalendarClient();

  if (!calendar) {
    console.log('Google Calendar is not configured or in Demo Mode. Returning fallback meeting link:', fallbackMeetingLink);
    if (isPlaceholderMeetingLink(fallbackMeetingLink)) {
      throw new Error('No meeting link configured. Please set a meeting link in settings first.');
    }
    return {
      meetingLink: fallbackMeetingLink,
      startTime: eventDate.toISOString(),
      eventId: `mock-event-${Math.random().toString(36).substring(7)}`
    };
  }

  let attemptResponse;
  try {
    // Attempt 1: Full detail event with attendees and conference data
    attemptResponse = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      conferenceDataVersion: 1,
      requestBody: {
        summary: `MorangoAI Consultation: ${args.name}`,
        description: `Consultation session for service: ${args.service}. Budget mentioned: ${args.budget || 'N/A'}. Scheduled via MorangoAI Receptionist. Guest Email: ${args.email}`,
        start: {
          dateTime: eventDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endEventDate.toISOString(),
          timeZone: 'UTC',
        },
        attendees: [{ email: args.email }],
        conferenceData: {
          createRequest: {
            requestId: `vapi-meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      },
    });
  } catch (err: any) {
    console.warn(`Attempt 1 failed (DWD or other error): ${err.message}. Retrying without attendees...`);
    try {
      // Attempt 2: Without attendees
      attemptResponse = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        conferenceDataVersion: 1,
        requestBody: {
          summary: `MorangoAI Consultation: ${args.name}`,
          description: `Consultation session for service: ${args.service}. Budget mentioned: ${args.budget || 'N/A'}. Scheduled via MorangoAI Receptionist. Guest Email: ${args.email}`,
          start: {
            dateTime: eventDate.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: endEventDate.toISOString(),
            timeZone: 'UTC',
          },
          conferenceData: {
            createRequest: {
              requestId: `vapi-meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        },
      });
    } catch (err2: any) {
      console.warn(`Attempt 2 failed (Invalid conference type or other error): ${err2.message}. Retrying with basic event details...`);
      try {
        // Attempt 3: Without attendees and without conference data
        attemptResponse = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: {
            summary: `MorangoAI Consultation: ${args.name}`,
            description: `Consultation session for service: ${args.service}. Budget mentioned: ${args.budget || 'N/A'}. Scheduled via MorangoAI Receptionist. Guest Email: ${args.email}`,
            start: {
              dateTime: eventDate.toISOString(),
              timeZone: 'UTC',
            },
            end: {
              dateTime: endEventDate.toISOString(),
              timeZone: 'UTC',
          },
        },
      });
      } catch (err3) {
        console.error('All Google Calendar event creation attempts failed:', err3);
        return {
          meetingLink: fallbackMeetingLink,
          startTime: eventDate.toISOString(),
          eventId: `mock-fallback-event-${Date.now()}`
        };
      }
    }
  }

  const event = attemptResponse.data;
  const meetingLink = event.hangoutLink || fallbackMeetingLink;

  if (isPlaceholderMeetingLink(meetingLink)) {
    throw new Error('No meeting link configured. Please set a meeting link in settings first.');
  }

  return {
    meetingLink,
    startTime: event.start?.dateTime || eventDate.toISOString(),
    eventId: event.id || ''
  };
}
