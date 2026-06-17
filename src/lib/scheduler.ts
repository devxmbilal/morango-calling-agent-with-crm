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
    // 1. Load configuration settings dynamically
    let remindersEnabled = true;
    let reminderTimeMins = 60;
    let adminEmail = 'sales@morangoai.com';

    try {
      const { supabase, isSupabaseConfigured } = require('./supabase');
      if (isSupabaseConfigured) {
        const { data } = await supabase.from('system_settings').select('*');
        if (data) {
          const settingsMap: Record<string, string> = {};
          data.forEach((row: any) => {
            settingsMap[row.key] = row.value;
          });
          remindersEnabled = settingsMap['reminders_enabled'] !== 'false';
          reminderTimeMins = parseInt(settingsMap['reminder_time'] || '60');
          adminEmail = settingsMap['admin_email'] || 'sales@morangoai.com';
        }
      } else {
        const fs = require('fs');
        const path = require('path');
        const MOCK_SETTINGS_FILE = path.join(process.cwd(), 'src/lib/mock_settings.json');
        if (fs.existsSync(MOCK_SETTINGS_FILE)) {
          const mockData = JSON.parse(fs.readFileSync(MOCK_SETTINGS_FILE, 'utf-8'));
          remindersEnabled = mockData.reminders_enabled !== 'false';
          reminderTimeMins = parseInt(mockData.reminder_time || '60');
          adminEmail = mockData.admin_email || 'sales@morangoai.com';
        }
      }
    } catch (err) {
      console.error('Error loading reminder scheduler settings:', err);
    }

    if (!remindersEnabled) {
      return; // Scheduler is turned off
    }

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

        // Pre-meeting reminder (triggered when the meeting starts in <= reminderTimeMins minutes)
        if (timeDifferenceMins > 0 && timeDifferenceMins <= reminderTimeMins) {
          const reminderNoteText = `[Reminder] Pre-meeting reminder sent for meeting scheduled at ${meeting.meeting_date}`;
          const alreadySent = lead.notes?.some(n => n.note.includes(`[Reminder] Pre-meeting reminder sent`));

          if (!alreadySent) {
            const emailsList = [lead.email];
            if (adminEmail && adminEmail.trim() && adminEmail.trim() !== lead.email) {
              emailsList.push(adminEmail.trim());
            }
            const toEmailList = emailsList.join(', ');
            console.log(`Sending pre-meeting reminder to ${toEmailList} for meeting ${meeting.id} (${Math.round(timeDifferenceMins)} mins before start)`);
            
            const success = await sendMeetingReminderEmail({
              to: toEmailList,
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
      }
    }
  } catch (err) {
    console.error('Error in checkAndSendReminders:', err);
  }
}
