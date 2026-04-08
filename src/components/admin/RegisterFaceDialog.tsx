"use client";

import { useState, useRef } from "react";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserIcon, Loader2, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { registerFace, checkFaceServiceHealth } from "@/services/faceService";
import { FaceCameraPreview, FaceCameraPreviewRef } from "@/components/scan/FaceCameraPreview";
import { useToast } from "@/hooks/use-toast";

interface RegisterFaceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function RegisterFaceDialog({ isOpen, onOpenChange, user }: RegisterFaceDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const faceCameraRef = useRef<FaceCameraPreviewRef>(null);

  const handleCapture = async () => {
    if (!user) return;

    // Check if face service is available
    const isHealthy = await checkFaceServiceHealth();
    if (!isHealthy) {
      toast({
        variant: "destructive",
        title: "Servicio no disponible",
        description: "El servicio de reconocimiento facial no está disponible.",
      });
      return;
    }

    // Capture FIRST before triggering re-renders
    const imageData = faceCameraRef.current?.captureImage();

    setStatus('capturing');
    setIsCapturing(true);

    if (!imageData) {
      setStatus('error');
      setIsCapturing(false);
      toast({
        variant: "destructive",
        title: "Error de captura",
        description: "No se pudo obtener la imagen de la cámara.",
      });
      return;
    }

    try {
      setCapturedImage(imageData);
      setStatus('success');
      toast({
        title: "Rostro capturado",
        description: "La imagen se ha capturado correctamente.",
      });
    } catch (error) {
      setStatus('error');
      toast({
        variant: "destructive",
        title: "Error de captura",
        description: "No se pudo acceder a la cámara o capturar la imagen.",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRegister = async () => {
    if (!user || !capturedImage) return;

    setIsCapturing(true);
    const result = await registerFace(user.id, capturedImage);

    if (result.status === 'success') {
      toast({
        title: "Rostro registrado",
        description: "El rostro se ha registrado correctamente.",
      });
      onOpenChange(false);
      setCapturedImage(null);
      setStatus('idle');
    } else {
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: result.message,
      });
    }
    setIsCapturing(false);
  };

  const handleClose = () => {
    setCapturedImage(null);
    setStatus('idle');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Registrar Rostro - {user?.fullName}
          </DialogTitle>
          <DialogDescription>
            Capture una imagen del rostro para el reconocimiento facial.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {capturedImage ? (
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured face"
                className="w-48 h-48 object-cover rounded-2xl border-4 border-primary/20"
              />
              {status === 'success' && (
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-2">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-sm">
                <FaceCameraPreview ref={faceCameraRef} />
            </div>
          )}

          <div className="text-center">
            {status === 'idle' && (
              <p className="text-sm text-muted-foreground">
                Haga clic en "Capturar" para tomar una foto
              </p>
            )}
            {status === 'capturing' && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Capturando imagen...</span>
              </div>
            )}
            {status === 'success' && (
              <p className="text-sm text-green-600 font-medium">
                ✓ Imagen capturada correctamente
              </p>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Error al capturar</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isCapturing}>
            Cancelar
          </Button>
          {!capturedImage ? (
            <Button onClick={handleCapture} disabled={isCapturing}>
              {isCapturing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Capturando...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Capturar
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleRegister} disabled={isCapturing}>
              {isCapturing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Registrar Rostro
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}