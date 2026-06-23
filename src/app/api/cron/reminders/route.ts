import { NextResponse } from 'next/server';
import { verifyWebhookSecret } from '@/lib/api-auth';
import { runReminderChecks } from '@/lib/scheduler';

export async function GET(req: Request) {
  if (!verifyWebhookSecret(req, 'CRON_SECRET', 'x-cron-secret')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await runReminderChecks();
    return NextResponse.json({ success: true, message: 'Reminder checks completed.' }, { status: 200 });
  } catch (err: any) {
    console.error('Cron reminder error:', err);
    return NextResponse.json({ error: err.message || 'Reminder check failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
