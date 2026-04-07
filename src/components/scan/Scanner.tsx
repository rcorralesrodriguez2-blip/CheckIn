
"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, QrcodeSuccessCallback, QrcodeErrorCallback } from "html5-qrcode";
import { format } from "date-fns";
import { User } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, ScanLine, LogIn, LogOut, MessageSquareWarning, Camera, FileImage, ArrowLeft, Fingerprint, RefreshCw } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { createAttendanceRecord, getTodaysAttendanceCount } from "@/services/attendanceService";
import { NewAttendanceRecord } from "@/types";
import { getUserById, getAllUsers } from "@/services/userService";
import { ReportErrorDialog } from "@/components/admin/ReportErrorDialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { captureFingerprint } from "@/services/fingerprintService";

const QR_SCANNER_ELEMENT_ID = "qr-scanner-region";

function Scanner({
  onAttendanceSaved,
  onCancel,
  isTerminal = false
}: {
  onAttendanceSaved: () => void,
  onCancel: () => void;
  isTerminal?: boolean;
}) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const [scanMethod, setScanMethod] = useState<'camera' | 'file' | 'fingerprint' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ type: 'entry' | 'exit'; userName: string } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUser, setLockedUser] = useState<User | null>(null);
  const [isReportErrorOpen, setIsReportErrorOpen] = useState(false);
  
  useEffect(() => {
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(err => console.error("Failed to stop scanner on cleanup.", err));
      }
    };
  }, []);

  useEffect(() => {
    // Si estamos en modo cámara y no hay mensajes de éxito/error bloqueando la vista
    if (scanMethod === 'camera' && !successInfo && !errorMessage) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode(QR_SCANNER_ELEMENT_ID, { verbose: false });
          qrScannerRef.current = html5QrCode;

          const qrCodeSuccessCallback: QrcodeSuccessCallback = (decodedText) => {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                processQrCode(decodedText);
              }).catch(err => console.error("Failed to stop scanner after success.", err));
            }
          };

          const qrCodeErrorCallback: QrcodeErrorCallback = () => {};
          
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 280, height: 280 } },
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
        } catch (err) {
          console.error("Camera start error, trying user camera:", err);
          try {
            await qrScannerRef.current?.start(
              { facingMode: "user" },
              { fps: 15, qrbox: { width: 280, height: 280 } },
              (text) => {
                qrScannerRef.current?.stop().then(() => processQrCode(text));
              },
              () => {}
            );
          } catch (err2) {
             setErrorMessage(t('camera_permission_denied'));
          }
        }
      };
      
      startScanner();
    } else {
      // Detener cámara si cambiamos de método o hay un resultado visible
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(err => console.error("Failed to stop scanner.", err));
      }
    }
  }, [scanMethod, successInfo, errorMessage, t]);

  const handleFingerprintScan = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    const scanResult = await captureFingerprint();

    if (scanResult.status === 'error') {
      setErrorMessage(scanResult.message || "No se pudo leer la huella.");
      setIsLoading(false);
      
      // Auto-reset después de error en 3 segundos en terminal
      if (isTerminal) setTimeout(handleReset, 3000);
      return;
    }

    // Identificar usuario
    const users = await getAllUsers();
    const matchedUser = users.find(u => u.fingerprintTemplate === scanResult.template);

    if (!matchedUser) {
      setErrorMessage("Huella digital no reconocida. Por favor, registre la huella primero.");
      setIsLoading(false);
      if (isTerminal) setTimeout(handleReset, 3000);
      return;
    }

    await saveAttendance(matchedUser, 'fingerprint');
  };

  const processQrCode = async (decodedText: string) => {
    if (isLoading || successInfo) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    
    let userId: string;
    try {
      const data = JSON.parse(decodedText);
      userId = data.id;
      if (!userId) throw new Error(t('qr_missing_id_error'));
    } catch (e) {
      setErrorMessage(t('invalid_qr_format_error'));
      setIsLoading(false);
      if (isTerminal) setTimeout(handleReset, 3000);
      return;
    }

    const user = await getUserById(userId);
    if (!user) {
      setErrorMessage(t('user_not_found_error', { userId }));
      setIsLoading(false);
      if (isTerminal) setTimeout(handleReset, 3000);
      return;
    }

    await saveAttendance(user, 'qr');
  };

  const saveAttendance = async (user: User, method: 'qr' | 'fingerprint') => {
    try {
      const todaysCount = await getTodaysAttendanceCount(user.id);
      const determinedType: 'entry' | 'exit' = (todaysCount % 2 === 0) ? 'entry' : 'exit';

      if (determinedType === 'exit' && user.exitLockUntil && user.exitLockUntil > new Date()) {
        const lockTime = format(user.exitLockUntil, 'p');
        setErrorMessage(t('exit_denied_message', { time: lockTime }));
        setIsLocked(true);
        setLockedUser(user);
        setIsLoading(false);
        if (isTerminal) setTimeout(handleReset, 5000);
        return;
      }

      const newRecord: NewAttendanceRecord = {
        userId: user.id,
        timestamp: new Date(),
        type: determinedType,
        observations: "",
        method: method
      };
  
      await createAttendanceRecord(newRecord);
      toast({ title: t('success_alert_title'), description: t('attendance_saved_successfully') });
      setSuccessInfo({ type: determinedType, userName: user.fullName });
      
      // En modo terminal, el reinicio es automático y rápido
      const resetDelay = isTerminal ? 4000 : 5000;
      setTimeout(() => {
          handleReset();
          onAttendanceSaved();
      }, resetDelay);
    } catch (error) {
       console.error("Error saving attendance:", error);
       setErrorMessage(t('generic_error_message'));
       if (isTerminal) setTimeout(handleReset, 5000);
    } finally {
        setIsLoading(false);
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setScanMethod('file');
        setIsLoading(true);
        setErrorMessage(null);

        const tempScannerDiv = document.createElement('div');
        tempScannerDiv.id = `temp-scanner-${Date.now()}`;
        tempScannerDiv.style.display = 'none';
        document.body.appendChild(tempScannerDiv);
        
        const html5QrCode = new Html5Qrcode(tempScannerDiv.id, { verbose: false });

        try {
            const decodedText = await html5QrCode.scanFile(file, false);
            await processQrCode(decodedText);
        } catch (err) {
            setErrorMessage(t('scan_from_image_error'));
            setIsLoading(false);
            if (isTerminal) setTimeout(handleReset, 3000);
        } finally {
            document.body.removeChild(tempScannerDiv);
            if (event.target) event.target.value = '';
        }
    }
  };
  
  const handleReset = () => {
    // Si es terminal y estábamos en cámara, volvemos a cámara automáticamente
    const previousMethod = scanMethod;
    setSuccessInfo(null);
    setErrorMessage(null);
    setIsLoading(false);
    setIsLocked(false);
    setLockedUser(null);
    
    if (isTerminal && previousMethod === 'camera') {
        setScanMethod('camera');
    } else if (!isTerminal) {
        setScanMethod(null);
    }
  };

  const renderInitialChoice = () => (
    <div className="flex flex-col items-center justify-center p-4 min-h-[400px] gap-6 animate-in fade-in zoom-in duration-500">
        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-10 h-16 p-1.5 glass-card rounded-2xl">
            <TabsTrigger value="qr" className="text-lg font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">Código QR</TabsTrigger>
            <TabsTrigger value="finger" className="text-lg font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">Huella</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qr" className="space-y-6">
            <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                <Button className="w-full h-24 text-2xl font-black hover-lift rounded-3xl flex flex-col gap-1 shadow-xl shadow-primary/20" onClick={() => setScanMethod('camera')}>
                    <div className="flex items-center">
                        <Camera className="mr-4 h-8 w-8" />
                        {t('use_camera_button')}
                    </div>
                    <span className="text-[10px] opacity-60 font-black uppercase tracking-[0.2em]">Cámara en vivo</span>
                </Button>
                {!isTerminal && (
                  <Button variant="outline" className="w-full h-20 text-lg font-bold hover-lift glass-card rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                      <FileImage className="mr-3 h-6 w-6" />
                      {t('upload_qr_image_button')}
                  </Button>
                )}
            </div>
          </TabsContent>
          
          <TabsContent value="finger" className="flex flex-col items-center gap-8">
            <div className="p-10 bg-primary/5 rounded-full border-4 border-dashed border-primary/20 animate-pulse">
               <Fingerprint className="h-24 w-24 text-primary opacity-40" />
            </div>
            <Button size="lg" className="w-full max-w-sm h-20 text-2xl font-black shadow-2xl rounded-3xl" onClick={handleFingerprintScan}>
              <Fingerprint className="mr-4 h-8 w-8" />
              Escanear Huella
            </Button>
            <p className="text-sm text-center text-muted-foreground font-black uppercase tracking-widest opacity-60 max-w-[280px]">
              Coloque el dedo en el lector U.are.U 4500
            </p>
          </TabsContent>
        </Tabs>
        
        {!isTerminal && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="mt-4 font-bold uppercase tracking-widest text-[11px]">{t('cancel')}</Button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
    </div>
  );
  
  const renderScanner = () => (
    <div className="flex flex-col gap-6 items-center animate-in fade-in duration-500">
      <div className="w-full scanner-box group">
        <div id={QR_SCANNER_ELEMENT_ID} className="w-full rounded-[2rem] border-4 border-primary bg-black overflow-hidden aspect-square sm:aspect-video shadow-2xl transition-all group-hover:border-accent" />
        <div className="absolute top-4 left-4 z-20">
            <Badge className="bg-primary/80 backdrop-blur-md px-4 py-1.5 text-[10px] font-black uppercase tracking-widest animate-pulse border-none">
                Escaneando en tiempo real
            </Badge>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full px-4">
        <Button variant="ghost" size="lg" onClick={() => setScanMethod(null)} className="w-full h-14 glass-card font-black text-lg tracking-tight uppercase rounded-2xl">
          <RefreshCw className="mr-3 h-5 w-5" />
          Cambiar Método
        </Button>
      </div>
    </div>
  );
  
  const renderSuccess = () => (
     <div className="flex flex-col items-center justify-center p-6 min-h-[400px] gap-8 text-center animate-in zoom-in duration-500">
      <div className="bg-green-500/10 dark:bg-green-900/30 p-12 rounded-full shadow-inner animate-bounce ring-[12px] ring-green-500/10">
        <CheckCircle className="h-32 w-32 text-green-500" />
      </div>
      <div className="space-y-6">
        <h2 className="text-5xl md:text-6xl font-black text-green-600 dark:text-green-400 tracking-tighter uppercase font-headline">
          {successInfo?.type === 'entry' ? t('entry_registered_successfully') : t('exit_registered_successfully')}
        </h2>
        <div className="p-6 bg-white/5 backdrop-blur-sm rounded-[2rem] inline-block border border-green-500/20 shadow-xl">
            <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight">{successInfo?.userName}</p>
        </div>
        <div className="flex flex-col items-center gap-4">
            <Badge className="px-8 py-3 text-sm font-black uppercase tracking-[0.3em] bg-green-500 text-white animate-pulse rounded-full shadow-lg shadow-green-500/20">
                ¡ASISTENCIA GUARDADA!
            </Badge>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest opacity-40 animate-pulse mt-4">Reiniciando terminal para el siguiente usuario...</p>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center p-4 min-h-[400px] gap-8 animate-in slide-in-from-top-4 duration-500">
      <Alert variant="destructive" className="border-4 glass-card bg-destructive/10 p-8 rounded-[2rem]">
        <AlertCircle className="h-10 w-10 mb-4" />
        <AlertTitle className="text-3xl font-black uppercase tracking-tighter mb-4">
          {isLocked ? t('exit_locked_title') : t('scan_error_title')}
        </AlertTitle>
        <AlertDescription className="text-xl font-bold opacity-90 leading-tight">{errorMessage}</AlertDescription>
      </Alert>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {isLocked && (
            <Button onClick={() => setIsReportErrorOpen(true)} className="w-full h-20 text-lg font-black transition-all hover:bg-amber-500 hover:text-white rounded-3xl" variant="outline">
                <MessageSquareWarning className="mr-3 h-8 w-8" /> {t('report_error_button')}
            </Button>
        )}
        <Button onClick={handleReset} className="w-full h-20 text-2xl font-black hover-lift transition-all rounded-3xl shadow-2xl shadow-primary/20">
            {isLocked ? t('ok_button') : t('rescan_button')}
        </Button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-4 min-h-[400px] animate-in fade-in duration-300">
      <div className="relative">
        <div className="h-32 w-32 rounded-full border-t-[6px] border-b-[6px] border-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <ScanLine className="h-14 w-14 text-primary animate-pulse" />
        </div>
      </div>
      <p className="text-foreground/80 text-3xl font-black mt-12 animate-pulse tracking-tighter uppercase">{t('verifying_message')}</p>
    </div>
  );
  
  const renderContent = () => {
    if (isLoading) return renderLoading();
    if (successInfo) return renderSuccess();
    if (errorMessage) return renderError();
    if (!scanMethod) return renderInitialChoice();
    if (scanMethod === 'camera') return renderScanner();
    return null;
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto shadow-2xl glass-card border-t-[12px] border-t-primary overflow-hidden rounded-[3rem]">
        <CardHeader className="text-center pb-8 border-b border-white/10 bg-muted/5 p-10">
          <CardTitle className="flex items-center justify-center gap-4 text-4xl font-black tracking-tighter uppercase font-headline">
            <ScanLine className="h-12 w-12 text-primary animate-pulse" />
            {isTerminal ? "Terminal de Entrada" : t('scanner_title')}
          </CardTitle>
          <CardDescription className="text-lg font-bold opacity-60 max-w-[320px] mx-auto leading-tight mt-2">
              {isTerminal ? "Registro rápido y automático para personal autorizado." : t('scanner_description_auto')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-10">
          <div className="p-2">
            {renderContent()}
          </div>
        </CardContent>
      </Card>
      <ReportErrorDialog
        isOpen={isReportErrorOpen}
        onOpenChange={setIsReportErrorOpen}
        user={lockedUser}
      />
    </>
  );
}

export function ScannerWrapper({ 
    onAttendanceSaved, 
    onCancel, 
    isTerminal = false 
}: { 
    onAttendanceSaved: () => void, 
    onCancel?: () => void,
    isTerminal?: boolean 
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return <Scanner onAttendanceSaved={onAttendanceSaved} onCancel={onCancel || (() => {})} isTerminal={isTerminal} />;
}
