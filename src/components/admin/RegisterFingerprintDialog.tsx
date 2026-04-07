
"use client";

import { useState } from "react";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Fingerprint, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { captureFingerprint } from "@/services/fingerprintService";
import { createUser } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

interface RegisterFingerprintDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function RegisterFingerprintDialog({ isOpen, onOpenChange, user }: RegisterFingerprintDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedTemplate, setCapturedTemplate] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');

  const handleCapture = async () => {
    if (!user) return;
    setStatus('capturing');
    setIsCapturing(true);
    
    const result = await captureFingerprint();
    
    if (result.status === 'success') {
      setCapturedTemplate(result.template);
      setStatus('success');
      toast({
        title: "Huella capturada",
        description: "La huella se ha leído correctamente.",
      });
    } else {
      setStatus('error');
      toast({
        variant: "destructive",
        title: "Error de hardware",
        description: result.message || "No se pudo leer la huella.",
      });
    }
    setIsCapturing(false);
  };

  const handleSave = async () => {
    if (!user || !capturedTemplate) return;
    
    try {
      await createUser({
        ...user,
        fingerprintTemplate: capturedTemplate
      });
      toast({
        title: "Perfil actualizado",
        description: "La huella digital ha sido vinculada al usuario.",
      });
      onOpenChange(false);
      setStatus('idle');
      setCapturedTemplate(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudo actualizar el perfil del usuario.",
      });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Vincular Huella Digital</DialogTitle>
          <DialogDescription className="font-medium">
            Registre la huella de <strong>{user.fullName}</strong> usando el lector U.are.U 4500.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-10 gap-6">
          <div className={`p-10 rounded-full transition-all duration-500 ring-8 ${
            status === 'capturing' ? 'bg-primary/20 ring-primary/20 animate-pulse' :
            status === 'success' ? 'bg-green-500/20 ring-green-500/20 scale-110' :
            status === 'error' ? 'bg-destructive/20 ring-destructive/20' :
            'bg-muted ring-muted/50'
          }`}>
            {status === 'success' ? (
              <CheckCircle2 className="h-20 w-20 text-green-500" />
            ) : status === 'error' ? (
              <AlertCircle className="h-20 w-20 text-destructive" />
            ) : (
              <Fingerprint className={`h-20 w-20 ${status === 'capturing' ? 'text-primary' : 'text-muted-foreground'}`} />
            )}
          </div>
          
          <p className="text-center font-bold text-lg">
            {status === 'idle' && "Presione el botón para iniciar la captura"}
            {status === 'capturing' && "Ponga el dedo en el lector..."}
            {status === 'success' && "Huella lista para vincular"}
            {status === 'error' && "Error en el lector de huellas"}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold">Cancelar</Button>
          {status === 'success' ? (
            <Button onClick={handleSave} className="font-bold shadow-lg">Vincular Huella</Button>
          ) : (
            <Button onClick={handleCapture} disabled={isCapturing} className="font-bold shadow-lg">
              {isCapturing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === 'error' ? "Reintentar Captura" : "Capturar Huella"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
