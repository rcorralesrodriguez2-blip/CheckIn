"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Loader2 } from "lucide-react";

export interface FaceCameraPreviewRef {
  captureImage: () => string;
}

export const FaceCameraPreview = forwardRef<FaceCameraPreviewRef>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          currentStream = stream;
        }
      }).catch(err => {
        console.error("Camera access error:", err);
      });

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    captureImage: () => {
      if (!videoRef.current) return '';
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
      }
      return '';
    }
  }));

  return (
    <div className="relative overflow-hidden rounded-[2rem] border-4 border-accent shadow-2xl aspect-square sm:aspect-video w-full bg-black group flex items-center justify-center">
      <Loader2 className="absolute h-8 w-8 animate-spin text-accent" />
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover z-10" />
      <div className="absolute top-4 left-4 z-20">
          <span className="bg-accent/80 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
              Cámara Activa
          </span>
      </div>
    </div>
  );
});

FaceCameraPreview.displayName = 'FaceCameraPreview';
