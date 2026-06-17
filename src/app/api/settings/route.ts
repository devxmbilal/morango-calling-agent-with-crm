import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyJWT } from '@/lib/jwt';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'morango_default_secret_key_12345!';
const MOCK_SETTINGS_FILE = path.join(process.cwd(), 'src/lib/mock_settings.json');

// Helper to authorize session
async function checkAuth(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get('Cookie') || '';
  const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('morango_auth_token='));
  if (!tokenCookie) return false;
  
  const token = tokenCookie.split('=')[1];
  const payload = await verifyJWT(token, JWT_SECRET);
  return !!payload;
}

// Helpers for mock settings
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

function writeMockSettings(settings: Record<string, string>) {
  try {
    fs.writeFileSync(MOCK_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Error writing mock settings:', err);
  }
}

// GET: Retrieve SMTP Configuration
export async function GET(req: Request) {
  try {
    const isAuthed = await checkAuth(req);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const config: Record<string, string> = {
      smtp_host: 'smtp.gmail.com',
      smtp_port: '587',
      smtp_user: '',
      smtp_pass: '',
      smtp_from: 'sales@morangoai.com',
      meeting_link: 'https://calendly.com/morangoai',
      admin_email: 'sales@morangoai.com'
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (!error && data) {
        data.forEach(row => {
          config[row.key] = row.value;
        });
      }
    } else {
      const mockData = readMockSettings();
      Object.assign(config, mockData);
    }

    // Mask password before returning to client
    if (config.smtp_pass && config.smtp_pass.trim() !== '') {
      config.smtp_pass = '••••••••';
    }

    return NextResponse.json(config, { status: 200 });
  } catch (err: any) {
    console.error('Fetch settings error:', err);
    return NextResponse.json({ error: 'Failed to retrieve settings.' }, { status: 500 });
  }
}

// POST: Save SMTP Configuration
export async function POST(req: Request) {
  try {
    const isAuthed = await checkAuth(req);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, meeting_link, admin_email } = await req.json();

    if (!smtp_host || !smtp_port || !smtp_user || !smtp_from) {
      return NextResponse.json({ error: 'Required fields: Host, Port, Username, Sender Email' }, { status: 400 });
    }

    // Read existing settings first to see if we should retain masked password
    let existingPass = '';
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('system_settings').select('*').eq('key', 'smtp_pass').single();
      if (data) {
        existingPass = data.value;
      }
    } else {
      const mockData = readMockSettings();
      existingPass = mockData['smtp_pass'] || '';
    }

    const finalPassword = (smtp_pass === '••••••••' || !smtp_pass) ? existingPass : smtp_pass;

    const newSettings: Record<string, string> = {
      smtp_host: smtp_host.trim(),
      smtp_port: smtp_port.toString().trim(),
      smtp_user: smtp_user.trim(),
      smtp_pass: finalPassword,
      smtp_from: smtp_from.trim(),
      meeting_link: (meeting_link || 'https://calendly.com/morangoai').trim(),
      admin_email: (admin_email || 'sales@morangoai.com').trim()
    };

    if (isSupabaseConfigured) {
      // Upsert keys sequentially
      const upserts = Object.keys(newSettings).map(async (key) => {
        return supabase.from('system_settings').upsert({
          key,
          value: newSettings[key]
        });
      });
      await Promise.all(upserts);
    } else {
      writeMockSettings(newSettings);
    }

    return NextResponse.json({ message: 'SMTP configurations updated successfully!' }, { status: 200 });
  } catch (err: any) {
    console.error('Save settings error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save settings.' }, { status: 500 });
  }
}
