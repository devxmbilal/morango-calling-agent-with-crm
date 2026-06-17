import nodemailer from 'nodemailer';
import { supabase, isSupabaseConfigured } from './supabase';
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
 * Sends a meeting confirmation email using Nodemailer with SMTP configurations from the database.
 */
export async function sendConfirmationEmail(args: {
  to: string;
  name: string;
  service: string;
  meetingLink: string;
}): Promise<boolean> {
  try {
    let host = '';
    let port = 587;
    let user = '';
    let pass = '';
    let from = 'sales@morangoai.com';

    // 1. Fetch credentials dynamically
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (!error && data) {
        const settingsMap: Record<string, string> = {};
        data.forEach(row => {
          settingsMap[row.key] = row.value;
        });

        host = settingsMap['smtp_host'] || '';
        port = parseInt(settingsMap['smtp_port'] || '587');
        user = settingsMap['smtp_user'] || '';
        pass = settingsMap['smtp_pass'] || '';
        from = settingsMap['smtp_from'] || 'sales@morangoai.com';
      }
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

    if (!host || !user || !pass) {
      console.warn('SMTP Credentials are not configured. Skipping confirmation email.');
      return false;
    }

    // 2. Initialize Nodemailer SMTP transport
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

    // 3. Email templates
    const mailOptions = {
      from: `"MorangoAI Sales Team" <${from}>`,
      to: args.to,
      subject: 'Meeting Confirmed: MorangoAI Consultation',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #ECEDEF; border-radius: 16px; background-color: #FFFFFF;">
          <h2 style="color: #16191D; font-weight: 800; font-size: 20px; margin-bottom: 16px;">Hello ${args.name},</h2>
          <p style="color: #5A616E; font-size: 14.5px; line-height: 1.6; margin-bottom: 20px;">
            Your MorangoAI consultation call for <strong>${args.service}</strong> service has been successfully scheduled.
          </p>
          <div style="background-color: #FAFBFC; border: 1px solid #F1F2F4; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13.5px; color: #9AA1AD; font-weight: 600; text-transform: uppercase;">Google Meet Link</p>
            <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 700;">
              <a href="${args.meetingLink}" target="_blank" style="color: #E8483D; text-decoration: none;">Join Google Meet Consultation</a>
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

    const info = await transporter.sendMail(mailOptions);
    console.log('Meeting confirmation email sent successfully:', info.messageId);
    return true;
  } catch (err) {
    console.error('Error sending confirmation email via SMTP:', err);
    return false;
  }
}
