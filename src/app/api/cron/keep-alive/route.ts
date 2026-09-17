import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured in environment variables.');
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 },
    );
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  const providedAuth = authHeader || '';

  const expectedBuffer = Buffer.from(expectedAuth);
  const providedBuffer = Buffer.from(providedAuth);

  const isAuthorized =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const result = await prisma.$queryRaw<[{ now: Date }]>`SELECT NOW() as now`;
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Supabase keep-alive ping successful',
      duration: `${duration}ms`,
      timestamp: result[0]?.now ?? new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Keep-alive database query failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database keep-alive ping failed',
      },
      { status: 500 },
    );
  }
}
