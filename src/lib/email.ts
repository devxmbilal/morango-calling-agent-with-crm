import nodemailer from 'nodemailer';
import { isServerDbConfigured } from './db-server';
import { dbServer } from './db-server';
import fs from 'fs';
import path from 'path';

const MOCK_SETTINGS_FILE = path.join(process.cwd(), 'src/lib/mock_settings.json');

// Helper to read mock settings
function readMockSettings(): Record<string, string> {
  try {
    if (!fs.existsSync(MOCK_SETTINGS_FILE)) {
      fs.writeFileSync(MOCK_SETTINGS_FILE, JSON.stringify({}));
      return {};
    }
    const data = fs.readFileSync(MOCK_SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading mock settings:', err);
    return {};
  }
}

/**
 * Dynamically loads SMTP configurations from Supabase or local mock configurations and builds a Nodemailer transporter.
 */
async function getSmtpTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string } | null> {
  try {
    let host = '';
    let port = 587;
    let user = '';
    let pass = '';
    let from = 'sales@morangoai.com';

    // 1. Fetch credentials dynamically
    if (isServerDbConfigured) {
      const settingsMap = await dbServer.getAllSettings();
      host = settingsMap['smtp_host'] || '';
      port = parseInt(settingsMap['smtp_port'] || '587');
      user = settingsMap['smtp_user'] || '';
      pass = settingsMap['smtp_pass'] || '';
      from = settingsMap['smtp_from'] || 'sales@morangoai.com';
    } else {
      const settingsMap = readMockSettings();
      host = settingsMap['smtp_host'] || '';
      port = parseInt(settingsMap['smtp_port'] || '587');
      user = settingsMap['smtp_user'] || '';
      pass = settingsMap['smtp_pass'] || '';
      from = settingsMap['smtp_from'] || 'sales@morangoai.com';
    }

    // Fallbacks to environment variables if no dynamic SMTP is configured
    if (!host || !user || !pass) {
      host = process.env.SMTP_HOST || '';
      port = parseInt(process.env.SMTP_PORT || '587');
      user = process.env.SMTP_USER || '';
      pass = process.env.SMTP_PASS || '';
      from = process.env.SMTP_FROM || 'sales@morangoai.com';
    }

    if (!host) {
      host = 'smtp.gmail.com';
    }
    
    if (!host || !user || !pass) {
      console.warn('SMTP Credentials are not configured. Skipping email.');
      return null;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // Use SSL/TLS for port 465, otherwise STARTTLS
      auth: {
        user,
        pass,
      },
    });

    const isTestConnection = await transporter.verify();
    if (!isTestConnection) {
      throw new Error('SMTP connection verification failed.');
    }

    return { transporter, from };
  } catch (err) {
    console.error('Error creating SMTP transporter:', err);
    return null;
  }
}

/**
 * Sends a meeting confirmation email to the attendee.
 */
export async function sendConfirmationEmail(args: {
  to: string;
  name: string;
  service: string;
  meetingLink: string;
  meetingDate: string;
}): Promise<boolean> {
  try {
    const smtp = await getSmtpTransporter();
    if (!smtp) return false;

    // Format meeting date and time nicely
    let formattedDate = args.meetingDate;
    try {
      const dateObj = new Date(args.meetingDate);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (e) {
      console.error('Error formatting meeting date for email:', e);
    }

    let activeMeetingLink = args.meetingLink;
    if (!activeMeetingLink || activeMeetingLink.trim() === '' || activeMeetingLink === 'https://calendly.com/morangoai' || activeMeetingLink === 'https://calendly.com/mornagoai') {
      try {
        if (isServerDbConfigured) {
          activeMeetingLink = (await dbServer.getSetting('meeting_link')) || '';
        }
      } catch (err) {
        console.error('Error fetching fallback link for confirmation email:', err);
      }
    }
    if (!activeMeetingLink || activeMeetingLink.trim() === '' || activeMeetingLink === 'https://calendly.com/morangoai' || activeMeetingLink === 'https://calendly.com/mornagoai') {
      throw new Error('No meeting link configured. Please set a meeting link in settings first.');
    }

    const mailOptions = {
      from: `"MorangoAI Sales Team" <${smtp.from}>`,
      to: args.to,
      subject: 'Meeting Confirmed: MorangoAI Consultation',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #ECEDEF; border-radius: 16px; background-color: #FFFFFF;">
          <h2 style="color: #16191D; font-weight: 800; font-size: 20px; margin-bottom: 16px;">Hello ${args.name},</h2>
          <p style="color: #5A616E; font-size: 14.5px; line-height: 1.6; margin-bottom: 20px;">
            Your MorangoAI consultation call for <strong>${args.service}</strong> service has been successfully scheduled.
          </p>
          
          <div style="background-color: #FAFBFC; border: 1px solid #F1F2F4; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 13.5px; color: #9AA1AD; font-weight: 600; text-transform: uppercase;">Scheduled Time</p>
            <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700; color: #16191D;">
              ${formattedDate}
            </p>
          </div>

          <div style="background-color: #FAFBFC; border: 1px solid #F1F2F4; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13.5px; color: #9AA1AD; font-weight: 600; text-transform: uppercase;">Google Meet Link</p>
            <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700;">
              <a href="${activeMeetingLink}" target="_blank" style="color: #E8483D; text-decoration: none;">Join Google Meet Consultation</a>
            </p>
          </div>
          
          <p style="color: #5A616E; font-size: 14.5px; line-height: 1.6; margin-bottom: 24px;">
            If you need to change the meeting date or cancel, please reply directly to this email. We look forward to speaking with you!
          </p>
          <hr style="border: 0; border-top: 1px solid #F1F2F4; margin: 24px 0;" />
          <p style="color: #9AA1AD; font-size: 12px; margin: 0; font-weight: 500;">
            MorangoAI &bull; Chief Human + AI Strategy Services &bull; Powered by Voice Bots
          </p>
        </div>
      `,
    };

    const info = await smtp.transporter.sendMail(mailOptions);
    console.log('Meeting confirmation email sent successfully:', info.messageId);
    return true;
  } catch (err) {
    console.error('Error sending confirmation email via SMTP:', err);
    return false;
  }
}

/**
 * Sends a notification email to the admin when a new lead is captured.
 */
export async function sendAdminNotificationEmail(args: {
  to: string;
  lead: {
    name: string;
    phone: string;
    email: string;
    service: string;
    budget?: string;
    meetingDate?: string;
  };
}): Promise<boolean> {
  try {
    const smtp = await getSmtpTransporter();
    if (!smtp) return false;

    let formattedDate = 'Not Scheduled';
    if (args.lead.meetingDate) {
      try {
        const dateObj = new Date(args.lead.meetingDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch (e) {}
    }

    const mailOptions = {
      from: `"MorangoAI CRM Alert" <${smtp.from}>`,
      to: args.to,
      subject: `🚨 New Lead Captured: ${args.lead.name}`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #ECEDEF; border-radius: 16px; background-color: #FFFFFF;">
          <h2 style="color: #E8483D; font-weight: 800; font-size: 20px; margin-bottom: 6px; margin-top: 0;">New Lead Notification</h2>
          <p style="color: #5A616E; font-size: 14px; margin-bottom: 20px;">A new client lead has been gathered via the Vapi call receptionist bot.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #5A616E; border-bottom: 1px solid #F1F2F4; width: 130px;">Name</td>
              <td style="padding: 8px 0; color: #16191D; border-bottom: 1px solid #F1F2F4; font-weight: 700;">${args.lead.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #5A616E; border-bottom: 1px solid #F1F2F4;">Phone</td>
              <td style="padding: 8px 0; color: #16191D; border-bottom: 1px solid #F1F2F4;">${args.lead.phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #5A616E; border-bottom: 1px solid #F1F2F4;">Email</td>
              <td style="padding: 8px 0; color: #16191D; border-bottom: 1px solid #F1F2F4;">${args.lead.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #5A616E; border-bottom: 1px solid #F1F2F4;">Service Needed</td>
              <td style="padding: 8px 0; color: #16191D; border-bottom: 1px solid #F1F2F4; font-weight: 600;">${args.lead.service}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #5A616E; border-bottom: 1px solid #F1F2F4;">Budget</td>
              <td style="padding: 8px 0; color: #16191D; border-bottom: 1px solid #F1F2F4;">${args.lead.budget || 'Not mentioned'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #5A616E; border-bottom: 1px solid #F1F2F4;">Meeting Date</td>
              <td style="padding: 8px 0; color: #E8483D; border-bottom: 1px solid #F1F2F4; font-weight: 700;">${formattedDate}</td>
            </tr>
          </table>

          <p style="color: #9AA1AD; font-size: 12px; margin-top: 24px; border-top: 1px solid #F1F2F4; padding-top: 16px;">
            MorangoAI CRM &bull; Dynamic Lead Alerts
          </p>
        </div>
      `
    };

    await smtp.transporter.sendMail(mailOptions);
    console.log(`Admin notification email sent successfully to ${args.to}`);
    return true;
  } catch (err) {
    console.error('Error sending admin notification email:', err);
    return false;
  }
}

/**
 * Sends a same-day reminder email to the customer.
 */
export async function sendMeetingReminderEmail(args: {
  to: string;
  name: string;
  service: string;
  meetingLink: string;
  meetingDate: string;
}): Promise<boolean> {
  try {
    const smtp = await getSmtpTransporter();
    if (!smtp) return false;

    let formattedDate = args.meetingDate;
    try {
      const dateObj = new Date(args.meetingDate);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (e) {}

    let activeMeetingLink = args.meetingLink;
    if (!activeMeetingLink || activeMeetingLink.trim() === '' || activeMeetingLink === 'https://calendly.com/morangoai' || activeMeetingLink === 'https://calendly.com/mornagoai') {
      try {
        if (isServerDbConfigured) {
          activeMeetingLink = (await dbServer.getSetting('meeting_link')) || '';
        }
      } catch (err) {
        console.error('Error fetching fallback link for reminder email:', err);
      }
    }
    if (!activeMeetingLink || activeMeetingLink.trim() === '' || activeMeetingLink === 'https://calendly.com/morangoai' || activeMeetingLink === 'https://calendly.com/mornagoai') {
      throw new Error('No meeting link configured. Please set a meeting link in settings first.');
    }

    const mailOptions = {
      from: `"MorangoAI Sales Team" <${smtp.from}>`,
      to: args.to,
      subject: 'Reminder: Meeting Scheduled Today - MorangoAI',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #ECEDEF; border-radius: 16px; background-color: #FFFFFF;">
          <h2 style="color: #16191D; font-weight: 800; font-size: 20px; margin-bottom: 16px;">Hello ${args.name},</h2>
          <p style="color: #5A616E; font-size: 14.5px; line-height: 1.6; margin-bottom: 20px;">
            This is a friendly reminder that you have a scheduled consultation call for the <strong>${args.service}</strong> service today.
          </p>
          
          <div style="background-color: #FAFBFC; border: 1px solid #F1F2F4; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 13.5px; color: #9AA1AD; font-weight: 600; text-transform: uppercase;">Scheduled Time</p>
            <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700; color: #16191D;">
              ${formattedDate}
            </p>
          </div>

          <div style="background-color: #FAFBFC; border: 1px solid #F1F2F4; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13.5px; color: #9AA1AD; font-weight: 600; text-transform: uppercase;">Google Meet Link</p>
            <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700;">
              <a href="${activeMeetingLink}" target="_blank" style="color: #E8483D; text-decoration: none;">Click Here to Join Meeting</a>
            </p>
          </div>
          
          <p style="color: #5A616E; font-size: 14.5px; line-height: 1.6; margin-bottom: 24px;">
            Please make sure you have a working camera and microphone. We look forward to speaking with you shortly!
          </p>
          <hr style="border: 0; border-top: 1px solid #F1F2F4; margin: 24px 0;" />
          <p style="color: #9AA1AD; font-size: 12px; margin: 0; font-weight: 500;">
            MorangoAI &bull; Chief Human + AI Strategy Services &bull; Powered by Voice Bots
          </p>
        </div>
      `
    };

    await smtp.transporter.sendMail(mailOptions);
    console.log(`Meeting reminder email sent successfully to ${args.to}`);
    return true;
  } catch (err) {
    console.error('Error sending meeting reminder email:', err);
    return false;
  }
}

/**
 * Sends a post-meeting follow-up thank you email to the customer.
 */
export async function sendPostMeetingFollowUpEmail(args: {
  to: string;
  name: string;
  service: string;
}): Promise<boolean> {
  try {
    const smtp = await getSmtpTransporter();
    if (!smtp) return false;

    const mailOptions = {
      from: `"MorangoAI Sales Team" <${smtp.from}>`,
      to: args.to,
      subject: 'Thank you for meeting with MorangoAI!',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #ECEDEF; border-radius: 16px; background-color: #FFFFFF;">
          <h2 style="color: #16191D; font-weight: 800; font-size: 20px; margin-bottom: 16px;">Hello ${args.name},</h2>
          <p style="color: #5A616E; font-size: 14.5px; line-height: 1.6; margin-bottom: 20px;">
            Thank you for taking the time to speak with us today regarding your interest in our <strong>${args.service}</strong> service.
          </p>
          <p style="color: #5A616E; font-size: 14.5px; line-height: 1.6; margin-bottom: 20px;">
            Our strategy team is currently preparing a custom scope of work and proposal based on the requirements discussed. You will receive this via email in the coming business days.
          </p>
          <p style="color: #5A616E; font-size: 14.5px; line-height: 1.6; margin-bottom: 24px;">
            If you have any supplementary materials or further questions in the meantime, please feel free to reply directly to this thread.
          </p>
          <hr style="border: 0; border-top: 1px solid #F1F2F4; margin: 24px 0;" />
          <p style="color: #9AA1AD; font-size: 12px; margin: 0; font-weight: 500;">
            MorangoAI &bull; Chief Human + AI Strategy Services &bull; Powered by Voice Bots
          </p>
        </div>
      `
    };

    await smtp.transporter.sendMail(mailOptions);
    console.log(`Post-meeting follow-up email sent successfully to ${args.to}`);
    return true;
  } catch (err) {
    console.error('Error sending post-meeting follow-up email:', err);
    return false;
  }
}
