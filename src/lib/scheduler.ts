import { dbService } from './db';
import { sendMeetingReminderEmail, sendPostMeetingFollowUpEmail } from './email';

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Starts the automated meeting reminders and post-meeting follow-up polling scheduler.
 * Runs check immediately and then every 60 seconds.
 */
export function startReminderScheduler() {
  if (schedulerInterval) return; // Already running

  console.log('MorangoAI Meeting Reminder Scheduler Initialized.');

  // Run checks immediately, then repeat every minute
  checkAndSendReminders();
  schedulerInterval = setInterval(() => {
    checkAndSendReminders();
  }, 60 * 1000);
}

/**
 * Iterates through all scheduled meetings and checks if reminders or follow-ups need to be sent.
 */
async function checkAndSendReminders() {
  try {
    const leads = await dbService.getLeads();
    const now = new Date();

    for (const lead of leads) {
      if (!lead.meetings || lead.meetings.length === 0) continue;

      for (const meeting of lead.meetings) {
        if (meeting.status !== 'Scheduled') continue;

        const meetingTime = new Date(meeting.meeting_date);
        if (isNaN(meetingTime.getTime())) continue;

        const timeDifferenceMs = meetingTime.getTime() - now.getTime();
        const timeDifferenceMins = timeDifferenceMs / (60 * 1000);

        // 1. Same-day reminder (triggered between 0 and 15 minutes before the meeting starts)
        if (timeDifferenceMins > 0 && timeDifferenceMins <= 15) {
          const reminderNoteText = `[Reminder] Same-day reminder sent for meeting scheduled at ${meeting.meeting_date}`;
          const alreadySent = lead.notes?.some(n => n.note.includes(`[Reminder] Same-day reminder sent`));

          if (!alreadySent) {
            console.log(`Sending same-day meeting reminder to ${lead.email} for meeting ${meeting.id}`);
            const success = await sendMeetingReminderEmail({
              to: lead.email,
              name: lead.name,
              service: lead.service,
              meetingLink: meeting.meeting_link || 'https://meet.google.com/mock-link',
              meetingDate: meeting.meeting_date
            });

            if (success) {
              await dbService.addNote(lead.id, reminderNoteText);
            }
          }
        }

        // 2. 1-hour post-meeting follow-up (triggered between 60 minutes and 95 minutes after meeting start)
        const minutesSinceStart = (now.getTime() - meetingTime.getTime()) / (60 * 1000);
        if (minutesSinceStart >= 60 && minutesSinceStart <= 95) {
          const followUpNoteText = `[Follow-up] Post-meeting thank you sent for meeting scheduled at ${meeting.meeting_date}`;
          const alreadySent = lead.notes?.some(n => n.note.includes(`[Follow-up] Post-meeting thank you sent`));

          if (!alreadySent) {
            console.log(`Sending post-meeting follow-up to ${lead.email} for meeting ${meeting.id}`);
            const success = await sendPostMeetingFollowUpEmail({
              to: lead.email,
              name: lead.name,
              service: lead.service
            });

            if (success) {
              await dbService.addNote(lead.id, followUpNoteText);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in checkAndSendReminders:', err);
  }
}
