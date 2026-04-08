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
  console.log('API: Received attendance record:', record);
  
  if (!record?.userId || !record?.timestamp || !record?.type) {
    const missing = [];
    if (!record?.userId) missing.push('userId');
    if (!record?.timestamp) missing.push('timestamp');
    if (!record?.type) missing.push('type');
    console.error('API: Missing required fields:', missing);
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
  }

  try {
    console.log('API: Creating attendance record for user:', record.userId, 'Type:', record.type, 'Timestamp:', record.timestamp);
    await createAttendanceRecord(record);
    console.log('API: Attendance record created successfully');
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('API: Error creating attendance record:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
