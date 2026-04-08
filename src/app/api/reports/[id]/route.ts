import { NextRequest, NextResponse } from 'next/server';
import { updateReportStatus } from '@/services/db.service';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const status = body?.status;
  if (!status || (status !== 'new' && status !== 'read')) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    await updateReportStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
