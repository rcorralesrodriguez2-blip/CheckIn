import { NextRequest, NextResponse } from 'next/server';
import { createAttendanceRecord, getAllAttendanceRecords, getAttendanceRecords } from '@/services/db.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || undefined;
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

  const records = userId
    ? await getAttendanceRecords(userId, startDate, endDate)
    : await getAllAttendanceRecords(startDate, endDate);

  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const record = await request.json();
  if (!record?.userId || !record?.timestamp || !record?.type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await createAttendanceRecord(record);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
