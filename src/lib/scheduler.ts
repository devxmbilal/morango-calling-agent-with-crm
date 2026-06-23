import { dbServer, isServerDbConfigured } from './db-server';
import { sendMeetingReminderEmail } from './email';

let schedulerInterval: NodeJS.Timeout | null = null;

export function startReminderScheduler() {
  if (schedulerInterval || process.env.NODE_ENV === 'production') return;
  schedulerInterval = setInterval(() => {
    runReminderChecks().catch(err => console.error('Scheduler error:', err));
  }, 60 * 1000);
}

export async function runReminderChecks() {
  if (!isServerDbConfigured) return;

  try {
    const settings = await dbServer.getAllSettings();
    const remindersEnabled = settings.reminders_enabled !== 'false';
    const reminderTimeMins = parseInt(settings.reminder_time || '60', 10);
    const adminEmail = settings.admin_email || 'no-reply@morangoai.com';

    if (!remindersEnabled) return;

    const leads = await dbServer.getLeads();
    const now = new Date();

    for (const lead of leads) {
      if (!lead.meetings?.length) continue;

      for (const meeting of lead.meetings) {
        if (meeting.status !== 'Scheduled') continue;

        const meetingTime = new Date(meeting.meeting_date);
        if (isNaN(meetingTime.getTime())) continue;

        const timeDifferenceMins = (meetingTime.getTime() - now.getTime()) / (60 * 1000);

        if (timeDifferenceMins > 0 && timeDifferenceMins <= reminderTimeMins) {
          const reminderNoteText = `[Reminder] Pre-meeting reminder sent for meeting scheduled at ${meeting.meeting_date}`;
          const alreadySent = lead.notes?.some(n =>
            n.note.includes('[Reminder] Pre-meeting reminder sent')
          );

          if (!alreadySent) {
            const emailsList = [lead.email];
            if (adminEmail && adminEmail.trim() && adminEmail.trim() !== lead.email) {
              emailsList.push(adminEmail.trim());
            }

            const success = await sendMeetingReminderEmail({
              to: emailsList.join(', '),
              name: lead.name,
              service: lead.service,
              meetingLink: meeting.meeting_link || '',
              meetingDate: meeting.meeting_date,
            });

            if (success) {
              await dbServer.addNote(lead.id, reminderNoteText);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in runReminderChecks:', err);
    throw err;
  }
}
