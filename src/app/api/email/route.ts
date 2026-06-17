import { NextResponse } from 'next/server';
import { sendConfirmationEmail } from '@/lib/email';
import { verifyJWT } from '@/lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'morango_default_secret_key_12345!';

async function checkAuth(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get('Cookie') || '';
  const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('morango_auth_token='));
  if (!tokenCookie) return false;
  
  const token = tokenCookie.split('=')[1];
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

    const emailSent = await sendConfirmationEmail({
      to,
      name,
      service,
      meetingLink: meetingLink ,
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
