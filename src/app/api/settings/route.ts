import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, updateAppMode } from '@/services/db.service';

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const mode = body?.appMode;
  if (!mode || (mode !== 'corporate' && mode !== 'school')) {
    return NextResponse.json({ error: 'Invalid appMode' }, { status: 400 });
  }

  try {
    await updateAppMode(mode);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
