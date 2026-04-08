import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, getUser, updateUser } from '@/services/db.service';

const allowedFields = new Set(['fullName', 'role', 'password', 'photoUrl', 'exitLockUntil', 'fingerprintTemplate']);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(user);
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
    return NextResponse.json({ error: 'No valid user fields provided' }, { status: 400 });
  }

  try {
    await updateUser(id, filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
