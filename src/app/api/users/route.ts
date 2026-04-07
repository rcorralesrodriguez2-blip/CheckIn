import { NextRequest, NextResponse } from 'next/server';
import { createUser, getAllUsers } from '@/services/db.service';

export async function GET() {
  const users = await getAllUsers();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const user = await request.json();
  if (!user?.id || !user?.fullName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await createUser(user);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
