import { NextRequest, NextResponse } from 'next/server';
import { deleteAttendanceRecord, getAttendanceRecordById, updateAttendanceRecord } from '@/services/db.service';

const allowedFields = new Set(['timestamp', 'type', 'photoUrl', 'observations', 'method']);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getAttendanceRecordById(params.id);
  if (!record) {
    return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
  }
  return NextResponse.json(record);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const filtered: Record<string, any> = {};
  Object.keys(updates).forEach((key) => {
    if (allowedFields.has(key)) {
      filtered[key] = updates[key];
    }
  });

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: 'No valid attendance fields provided' }, { status: 400 });
  }

  try {
    await updateAttendanceRecord(params.id, filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteAttendanceRecord(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
