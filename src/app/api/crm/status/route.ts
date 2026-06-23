import { NextResponse } from 'next/server';
import { isServerDbConfigured } from '@/lib/db-server';

export async function GET() {
  return NextResponse.json({
    isDemoMode: !isServerDbConfigured,
    isConfigured: isServerDbConfigured,
  });
}
