import { NextRequest, NextResponse } from 'next/server';
import { getUser, updateUser } from '@/services/db.service';

export async function POST(request: NextRequest) {
  try {
    const { user_id, descriptor } = await request.json();

    if (!user_id || !descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const user = await getUser(user_id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Convert array to JSON string for MySQL storage to be safe
    const faceDescriptorJson = JSON.stringify(descriptor);

    await updateUser(user_id, { faceDescriptor: faceDescriptorJson as any });

    return NextResponse.json({ success: true, message: 'Face registered successfully' });
  } catch (error) {
    console.error('API /face/register error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
