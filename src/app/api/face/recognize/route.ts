import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/services/db.service';

// Calculate Euclidean distance between two descriptors
function getEuclideanDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

export async function POST(request: NextRequest) {
  try {
    const { descriptor } = await request.json();

    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json({ status: 'invalid_image', error: 'Invalid descriptor' }, { status: 400 });
    }

    const users = await getAllUsers();
    
    let bestMatch = null;
    // Lower distance is better in Euclidean matching.
    // In face-api.js, a distance < 0.6 is generally a good match.
    let minDistance = 0.6; 
    
    for (const user of users) {
      if (user.faceDescriptor) {
        let storedDescriptor: number[];
        // Handle parsing if it is stored as string in MySQL
        if (typeof user.faceDescriptor === 'string') {
          try {
            storedDescriptor = JSON.parse(user.faceDescriptor);
          } catch(e) { continue; }
        } else {
          storedDescriptor = user.faceDescriptor;
        }

        if (Array.isArray(storedDescriptor) && storedDescriptor.length > 0) {
          const distance = getEuclideanDistance(descriptor, storedDescriptor);
          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = user.id;
          }
        }
      }
    }

    if (bestMatch) {
      // Return 1 - distance to mimic a 'confidence' score where 1 is perfect
      return NextResponse.json({ 
        status: 'success', 
        user_id: bestMatch, 
        confidence: 1.0 - minDistance 
      });
    }

    return NextResponse.json({ status: 'not_recognized', user_id: null, confidence: 0 });
  } catch (error) {
    console.error('API /face/recognize error:', error);
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 });
  }
}
