import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getSupabaseAdmin, isServerDbConfigured } from '@/lib/supabase-admin';
import fs from 'fs';
import path from 'path';

const MOCK_SETTINGS_FILE = path.join(process.cwd(), 'src/lib/mock_settings.json');

function readMockSettings(): Record<string, string> {
  try {
    if (!fs.existsSync(MOCK_SETTINGS_FILE)) {
      fs.writeFileSync(MOCK_SETTINGS_FILE, JSON.stringify({}));
      return {};
    }
    return JSON.parse(fs.readFileSync(MOCK_SETTINGS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error reading mock settings:', err);
    return {};
  }
}

function writeMockSettings(settings: Record<string, string>) {
  try {
    fs.writeFileSync(MOCK_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Error writing mock settings:', err);
  }
}

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const config: Record<string, string> = {
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: 'sales@morangoai.com',
    meeting_link: 'https://calendly.com/morangoai',
    admin_email: 'sales@morangoai.com',
    reminders_enabled: 'true',
    reminder_time: '60',
  };

  try {
    if (isServerDbConfigured) {
      const { data, error } = await getSupabaseAdmin().from('system_settings').select('*');
      if (!error && data) {
        data.forEach(row => {
          config[row.key] = row.value;
        });
      }
    } else {
      Object.assign(config, readMockSettings());
    }

    if (config.smtp_pass?.trim()) {
      config.smtp_pass = '••••••••';
    }

    return NextResponse.json(config, { status: 200 });
  } catch (err: any) {
    console.error('Fetch settings error:', err);
    return NextResponse.json({ error: 'Failed to retrieve settings.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_pass,
      smtp_from,
      meeting_link,
      admin_email,
      reminders_enabled,
      reminder_time,
    } = await req.json();

    if (!smtp_host || !smtp_port || !smtp_user || !smtp_from) {
      return NextResponse.json({ error: 'Required fields: Host, Port, Username, Sender Email' }, { status: 400 });
    }

    let existingPass = '';
    if (isServerDbConfigured) {
      const { data } = await getSupabaseAdmin()
        .from('system_settings')
        .select('*')
        .eq('key', 'smtp_pass')
        .single();
      if (data) existingPass = data.value;
    } else {
      existingPass = readMockSettings()['smtp_pass'] || '';
    }

    const finalPassword = smtp_pass === '••••••••' || !smtp_pass ? existingPass : smtp_pass;

    const newSettings: Record<string, string> = {
      smtp_host: smtp_host.trim(),
      smtp_port: smtp_port.toString().trim(),
      smtp_user: smtp_user.trim(),
      smtp_pass: finalPassword,
      smtp_from: smtp_from.trim(),
      meeting_link: (meeting_link || 'https://calendly.com/morangoai').trim(),
      admin_email: (admin_email || 'sales@morangoai.com').trim(),
      reminders_enabled: reminders_enabled === 'false' ? 'false' : 'true',
      reminder_time: (reminder_time || '60').toString().trim(),
    };

    if (isServerDbConfigured) {
      const supabase = getSupabaseAdmin();
      for (const key of Object.keys(newSettings)) {
        const { data: existing } = await supabase
          .from('system_settings')
          .select('key')
          .eq('key', key)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('system_settings')
            .update({ value: newSettings[key] })
            .eq('key', key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('system_settings')
            .insert({ key, value: newSettings[key] });
          if (error) throw error;
        }
      }
    } else {
      writeMockSettings(newSettings);
    }

    return NextResponse.json({ message: 'SMTP configurations updated successfully!' }, { status: 200 });
  } catch (err: any) {
    console.error('Save settings error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save settings.' }, { status: 500 });
  }
}
