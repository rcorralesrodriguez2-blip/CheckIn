"use client";

import { User } from "@/types";

const FACE_API_BASE = "/api/face"; // Now hitting our own Next.js API routes

export interface FaceRegistrationResult {
  status: 'success' | 'error';
  message: string;
}

export interface FaceRecognitionResult {
  user_id: string | null;
  confidence: number;
  status: 'success' | 'no_face' | 'multiple_faces' | 'not_recognized' | 'invalid_image' | 'error';
}

let modelsLoaded = false;
let faceapiModule: any = null;

// Initialize and load face-api models from the public folder
export const loadFaceModels = async () => {
  if (typeof window === 'undefined') return false; // Prevent running during SSR
  if (modelsLoaded) return true;
  try {
    if (!faceapiModule) {
      faceapiModule = await import('@vladmandic/face-api');
    }
    await faceapiModule.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapiModule.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapiModule.nets.faceRecognitionNet.loadFromUri('/models');
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error("Error loading face-api models:", error);
    return false;
  }
};

// Helper function to extract a face descriptor from a base64 image data string
export const extractFaceDescriptor = async (imageData: string): Promise<Float32Array | null | 'multiple_faces'> => {
  if (typeof window === 'undefined') return null; // Prevent running during SSR
  await loadFaceModels();
  if (!faceapiModule) return null;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageData;
    img.onload = async () => {
      try {
        const detections = await faceapiModule.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
        if (detections.length === 0) {
          resolve(null);
        } else if (detections.length > 1) {
          resolve('multiple_faces');
        } else {
          resolve(detections[0].descriptor);
        }
      } catch (err) {
        console.error("Face detection error:", err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
};

export const registerFace = async (userId: string, imageData: string): Promise<FaceRegistrationResult> => {
  try {
    const descriptorArray = await extractFaceDescriptor(imageData);
    
    if (descriptorArray === 'multiple_faces') {
      return { status: 'error', message: 'Se detectaron múltiples rostros. Por favor, asegúrese de que solo haya una persona en la cámara.' };
    }
    
    if (!descriptorArray) {
      return { status: 'error', message: 'No se detectó ningún rostro válido en la imagen.' };
    }

    // Convert Float32Array to standard array for JSON transport
    const descriptor = Array.from(descriptorArray);

    const response = await fetch(`${FACE_API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        descriptor: descriptor
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return {
        status: 'success',
        message: result.message || 'Rostro registrado con éxito'
      };
    } else {
      return {
        status: 'error',
        message: result.error || 'Error registrando rostro en el servidor'
      };
    }
  } catch (error) {
    console.error("Face registration error:", error);
    return {
      status: 'error',
      message: 'Error de red durante el registro del rostro'
    };
  }
};

export const recognizeFace = async (imageData: string): Promise<FaceRecognitionResult> => {
  try {
    const descriptorArray = await extractFaceDescriptor(imageData);
    
    if (descriptorArray === 'multiple_faces') {
      return { user_id: null, confidence: 0, status: 'multiple_faces' };
    }
    
    if (!descriptorArray) {
      return { user_id: null, confidence: 0, status: 'no_face' };
    }

    // Convert Float32Array to standard array for JSON transport
    const descriptor = Array.from(descriptorArray);

    const response = await fetch(`${FACE_API_BASE}/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descriptor: descriptor
      }),
    });

    if (!response.ok) {
      return {
        user_id: null,
        confidence: 0,
        status: 'error'
      };
    }

    const result: FaceRecognitionResult = await response.json();
    return result;
  } catch (error) {
    console.error("Face recognition error:", error);
    return {
      user_id: null,
      confidence: 0,
      status: 'error'
    };
  }
};

export const captureFaceImage = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create video element for camera access
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // Request camera access
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        video.srcObject = stream;
        video.play();

        // Wait for video to be ready
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Capture frame after a short delay
          setTimeout(() => {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to base64
            const imageData = canvas.toDataURL('image/jpeg', 0.8);

            // Stop camera stream
            stream.getTracks().forEach(track => track.stop());

            resolve(imageData);
          }, 1000); // Wait 1 second for camera to stabilize
        };
      })
      .catch(error => {
        reject(new Error(`Camera access denied: ${error.message}`));
      });
  });
};

export const checkFaceServiceHealth = async (): Promise<boolean> => {
  // Service health depends purely on the models successfully loading in frontend
  return await loadFaceModels();
};