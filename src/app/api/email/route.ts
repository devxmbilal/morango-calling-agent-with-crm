import { NextResponse } from 'next/server';
import { sendConfirmationEmail } from '@/lib/email';
import { requireAuth } from '@/lib/api-auth';
import { dbServer, isServerDbConfigured } from '@/lib/db-server';

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { to, name, service, meetingLink, meetingDate } = await req.json();

    if (!to || !name || !service || !meetingDate) {
      return NextResponse.json({ error: 'Required fields: to, name, service, meetingDate' }, { status: 400 });
    }

    let activeMeetingLink = meetingLink;
    if (
      !activeMeetingLink ||
      activeMeetingLink.trim() === '' ||
      activeMeetingLink === 'https://calendly.com/morangoai' ||
      activeMeetingLink === 'https://calendly.com/mornagoai'
    ) {
      if (isServerDbConfigured) {
        activeMeetingLink = (await dbServer.getSetting('meeting_link')) || '';
      }
    }

    if (
      !activeMeetingLink ||
      activeMeetingLink.trim() === '' ||
      activeMeetingLink === 'https://calendly.com/morangoai' ||
      activeMeetingLink === 'https://calendly.com/mornagoai'
    ) {
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
    }

    return NextResponse.json({ error: 'Failed to send email. Check SMTP settings.' }, { status: 500 });
  } catch (err: any) {
    console.error('Email API route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send email.' }, { status: 500 });
  }
}
