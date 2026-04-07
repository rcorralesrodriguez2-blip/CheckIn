import { NextRequest, NextResponse } from 'next/server';
import { createReport, getReports } from '@/services/db.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || undefined;
  const reports = await getReports(userId);
  return NextResponse.json(reports);
}

export async function POST(request: NextRequest) {
  const report = await request.json();
  if (!report?.id || !report?.userId || !report?.title || !report?.description) {
    return NextResponse.json({ error: 'Missing required report fields' }, { status: 400 });
  }

  try {
    await createReport(report.id, report.userId, report.title, report.description);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
