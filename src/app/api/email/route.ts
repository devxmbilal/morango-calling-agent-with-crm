import { NextResponse } from 'next/server';
import { sendConfirmationEmail } from '@/lib/email';
import { verifyJWT } from '@/lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET as string;
  if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing.');
}

async function checkAuth(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get('Cookie') || '';
  const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('morango_auth_token='));
  if (!tokenCookie) return false;
  
  const token = tokenCookie.split('=')[1];
  if (!token) return false;
  const payload = await verifyJWT(token, JWT_SECRET);
  return !!payload;
}

export async function POST(req: Request) {
  try {
    const isAuthed = await checkAuth(req);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { to, name, service, meetingLink, meetingDate } = await req.json();

    if (!to || !name || !service || !meetingDate) {
      return NextResponse.json({ error: 'Required fields: to, name, service, meetingDate' }, { status: 400 });
    }

    let activeMeetingLink = meetingLink;
    if (!activeMeetingLink || activeMeetingLink.trim() === '' || activeMeetingLink === 'https://calendly.com/morangoai' || activeMeetingLink === 'https://calendly.com/mornagoai') {
      try {
        const { supabase, isSupabaseConfigured } = require('@/lib/supabase');
        if (isSupabaseConfigured) {
          const { data } = await supabase.from('system_settings').select('value').eq('key', 'meeting_link').single();
          if (data && data.value) {
            activeMeetingLink = data.value;
          }
        }
      } catch (err) {
        console.error('Error fetching fallback link in email route:', err);
      }
    }

    if (!activeMeetingLink || activeMeetingLink.trim() === '' || activeMeetingLink === 'https://calendly.com/morangoai' || activeMeetingLink === 'https://calendly.com/mornagoai') {
      return NextResponse.json({ error: 'No meeting link configured. Please set a meeting link in settings first.' }, { status: 400 });
    }

    const emailSent = await sendConfirmationEmail({
      to,
      name,
      service,
      meetingLink: activeMeetingLink,
      meetingDate,
    });

    if (emailSent) {
      return NextResponse.json({ message: 'Email sent successfully!' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Failed to send email. Check SMTP settings.' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Email API route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send email.' }, { status: 500 });
  }
}
