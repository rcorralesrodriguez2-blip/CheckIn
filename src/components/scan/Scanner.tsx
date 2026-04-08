
"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, QrcodeSuccessCallback, QrcodeErrorCallback } from "html5-qrcode";
import { format } from "date-fns";
import { User } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, ScanLine, LogIn, LogOut, MessageSquareWarning, Camera, FileImage, ArrowLeft, Fingerprint, RefreshCw, UserIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { createAttendanceRecord, getTodaysAttendanceCount } from "@/services/attendanceService";
import { NewAttendanceRecord } from "@/types";
import { getUserById, getAllUsers } from "@/services/userService";
import { ReportErrorDialog } from "@/components/admin/ReportErrorDialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { captureFingerprint } from "@/services/fingerprintService";
import { recognizeFace, checkFaceServiceHealth } from "@/services/faceService";
import { FaceCameraPreview, FaceCameraPreviewRef } from "@/components/scan/FaceCameraPreview";

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
  const scannerElementRef = useRef<HTMLDivElement | null>(null);
  const faceCameraRef = useRef<FaceCameraPreviewRef>(null);
  const isMountedRef = useRef(true);
  const tempScannersRef = useRef<Set<string>>(new Set());

  const [scanMethod, setScanMethod] = useState<'camera' | 'file' | 'fingerprint' | 'face' | null>(null);
  const [activeTab, setActiveTab] = useState('qr');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ type: 'entry' | 'exit'; userName: string; time: Date } | null>(null);
  const [liveTime, setLiveTime] = useState<Date | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUser, setLockedUser] = useState<User | null>(null);
  const [isReportErrorOpen, setIsReportErrorOpen] = useState(false);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Limpieza completa cuando se desmonta
      if (qrScannerRef.current) {
        try {
          // Forzar parada igual si está escaneando
          if (qrScannerRef.current.isScanning) {
            qrScannerRef.current.stop().catch(() => {});
          }
        } catch (e) {
          console.error("Error stopping scanner:", e);
        }
        // Limpiar la referencia
        qrScannerRef.current = null;
      }
      
      // Remover todos los elementos temporales del DOM
      tempScannersRef.current.forEach(id => {
        const elem = document.getElementById(id);
        if (elem?.parentNode) {
          try {
            elem.parentNode.removeChild(elem);
          } catch (e) {
            // Silenciosamente ignorar errores
          }
        }
      });
      tempScannersRef.current.clear();
    };
  }, []);

  // Live Timer Effect
  useEffect(() => {
    setLiveTime(new Date());
    const interval = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Si estamos en modo cámara y no hay mensajes de éxito/error bloqueando la vista
    if (scanMethod === 'camera' && !successInfo && !errorMessage && isMountedRef.current && scannerElementRef.current) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode(QR_SCANNER_ELEMENT_ID, { verbose: false });
          qrScannerRef.current = html5QrCode;

          const qrCodeSuccessCallback: QrcodeSuccessCallback = (decodedText) => {
            if (!isMountedRef.current) return;
            if (html5QrCode.isScanning && qrScannerRef.current) {
              html5QrCode.stop().then(() => {
                if (isMountedRef.current) {
                  processQrCode(decodedText);
                }
              }).catch(() => {});
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
          if (!isMountedRef.current) return;
          console.error("Camera start error, trying user camera:", err);
          try {
            await qrScannerRef.current?.start(
              { facingMode: "user" },
              { fps: 15, qrbox: { width: 280, height: 280 } },
              (text) => {
                if (!isMountedRef.current) return;
                qrScannerRef.current?.stop().then(() => {
                  if (isMountedRef.current) {
                    processQrCode(text);
                  }
                }).catch(() => {});
              },
              () => {}
            );
          } catch (err2) {
             if (isMountedRef.current) {
               setErrorMessage(t('camera_permission_denied'));
             }
          }
        }
      };
      
      startScanner();
    } else {
      // Detener cámara si cambiamos de método o hay un resultado visible
      if (qrScannerRef.current?.isScanning) {
        qrScannerRef.current.stop().catch(() => {});
      }
    }
  }, [scanMethod, successInfo, errorMessage, t]);

  const handleFingerprintScan = async () => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    const scanResult = await captureFingerprint();

    if (!isMountedRef.current) return;

    // Manejar casos de error o indisponibilidad
    if (scanResult.status !== 'success') {
      setErrorMessage(
        scanResult.message || 
        (scanResult.status === 'unavailable' 
          ? "Servicio de huella no disponible. Verifique que el lector esté conectado."
          : "No se pudo leer la huella.")
      );
      setIsLoading(false);
      
      // Auto-reset después de error en 3 segundos en terminal
      if (isTerminal) setTimeout(handleReset, 3000);
      return;
    }

    // Identificar usuario
    const users = await getAllUsers();
    if (!isMountedRef.current) return;
    
    const matchedUser = users.find(u => u.fingerprintTemplate === scanResult.template);

    if (!matchedUser) {
      setErrorMessage("Huella digital no reconocida. Por favor, registre la huella primero.");
      setIsLoading(false);
      if (isTerminal) setTimeout(handleReset, 3000);
      return;
    }

    if (isMountedRef.current) {
      await saveAttendance(matchedUser, 'fingerprint');
    }
  };

  const handleFaceScan = async () => {
    if (!isMountedRef.current) return;

    // Capture face image BEFORE setting isLoading (which unmounts the preview)
    const imageData = faceCameraRef.current?.captureImage();

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!imageData) {
        setErrorMessage("No se pudo obtener la imagen de la cámara.");
        setIsLoading(false);
        if (isTerminal) setTimeout(handleReset, 3000);
        return;
    }

    try {
      // Check if face service is available

      // Recognize face
      const recognitionResult = await recognizeFace(imageData);

      if (!isMountedRef.current) return;

      // Handle recognition results
      if (recognitionResult.status !== 'success' || !recognitionResult.user_id) {
        let errorMsg = "No se pudo reconocer el rostro.";
        switch (recognitionResult.status) {
          case 'no_face':
            errorMsg = "No se detectó ningún rostro en la imagen.";
            break;
          case 'multiple_faces':
            errorMsg = "Se detectaron múltiples rostros. Por favor, capture solo un rostro.";
            break;
          case 'not_recognized':
            errorMsg = "Rostro no reconocido. Registre su rostro primero.";
            break;
          case 'invalid_image':
            errorMsg = "Imagen inválida. Intente nuevamente.";
            break;
          case 'error':
            errorMsg = "Error en el reconocimiento facial. Intente nuevamente.";
            break;
        }
        setErrorMessage(errorMsg);
        setIsLoading(false);
        if (isTerminal) setTimeout(handleReset, 3000);
        return;
      }

      // Get user details
      const user = await getUserById(recognitionResult.user_id);
      if (!user) {
        setErrorMessage("Usuario reconocido pero no encontrado en la base de datos.");
        setIsLoading(false);
        if (isTerminal) setTimeout(handleReset, 3000);
        return;
      }

      if (isMountedRef.current) {
        await saveAttendance(user, 'face');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Face scan error:", error);
      setErrorMessage("Error accediendo a la cámara o procesando la imagen.");
      setIsLoading(false);
      if (isTerminal) setTimeout(handleReset, 3000);
    }
  };

  const processQrCode = async (decodedText: string) => {
    if (isLoading || successInfo || !isMountedRef.current) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    
    let userId: string;
    try {
      const data = JSON.parse(decodedText);
      userId = data.id;
      if (!userId) throw new Error(t('qr_missing_id_error'));
    } catch (e) {
      if (isMountedRef.current) {
        setErrorMessage(t('invalid_qr_format_error'));
        setIsLoading(false);
        if (isTerminal) setTimeout(handleReset, 3000);
      }
      return;
    }

    const user = await getUserById(userId);
    if (!user) {
      if (isMountedRef.current) {
        setErrorMessage(t('user_not_found_error', { userId }));
        setIsLoading(false);
        if (isTerminal) setTimeout(handleReset, 3000);
      }
      return;
    }

    if (isMountedRef.current) {
      await saveAttendance(user, 'qr');
    }
  };

  const saveAttendance = async (user: User, method: 'qr' | 'fingerprint' | 'face') => {
    console.log('Saving attendance for user:', user.id, 'method:', method);
    try {
      const todaysCount = await getTodaysAttendanceCount(user.id);
      const determinedType: 'entry' | 'exit' = (todaysCount % 2 === 0) ? 'entry' : 'exit';

      if (determinedType === 'exit' && user.exitLockUntil && user.exitLockUntil > new Date()) {
        if (!isMountedRef.current) return;
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
      console.log('New attendance record:', newRecord);
  
      await createAttendanceRecord(newRecord);
      console.log('Attendance record created successfully');
      if (!isMountedRef.current) return;
      
      toast({ 
        title: t('success_alert_title'), 
        description: `${determinedType === 'entry' ? t('entry') : t('exit')} ${t('registered_for')} ${user.fullName}` 
      });
      setSuccessInfo({ type: determinedType, userName: user.fullName, time: newRecord.timestamp as Date });
      
      // En modo terminal, el reinicio es automático y rápido
      const resetDelay = isTerminal ? 4000 : 5000;
      setTimeout(() => {
          if (isMountedRef.current) {
            handleReset();
            onAttendanceSaved();
          }
      }, resetDelay);
    } catch (error) {
       if (!isMountedRef.current) return;
       console.error("Error saving attendance:", error);
       setErrorMessage(t('generic_error_message'));
       if (isTerminal) setTimeout(handleReset, 5000);
    } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && isMountedRef.current) {
        setScanMethod('file');
        setIsLoading(true);
        setErrorMessage(null);

        const tempId = `temp-scanner-${Date.now()}`;
        const tempScannerDiv = document.createElement('div');
        tempScannerDiv.id = tempId;
        tempScannerDiv.style.display = 'none';
        document.body.appendChild(tempScannerDiv);
        tempScannersRef.current.add(tempId);
        
        const html5QrCode = new Html5Qrcode(tempId, { verbose: false });

        try {
            const decodedText = await html5QrCode.scanFile(file, false);
            if (isMountedRef.current) {
              await processQrCode(decodedText);
            }
        } catch (err) {
            if (isMountedRef.current) {
              setErrorMessage(t('scan_from_image_error'));
              setIsLoading(false);
              if (isTerminal) setTimeout(handleReset, 3000);
            }
        } finally {
            if (tempScannersRef.current.has(tempId)) {
              const elem = document.getElementById(tempId);
              if (elem?.parentNode) {
                try {
                  elem.parentNode.removeChild(elem);
                } catch (e) {
                  // Silenciosamente ignorar errores
                }
              }
              tempScannersRef.current.delete(tempId);
            }
            if (event.target) event.target.value = '';
        }
    }
  };
  
  const handleReset = () => {
    if (!isMountedRef.current) return;
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-10 h-16 p-1.5 glass-card rounded-2xl">
            <TabsTrigger value="qr" className="text-sm font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">QR</TabsTrigger>
            <TabsTrigger value="finger" className="text-sm font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">Huella</TabsTrigger>
            <TabsTrigger value="face" className="text-sm font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">Rostro</TabsTrigger>
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

          <TabsContent value="face" className="flex flex-col items-center gap-8">
            {activeTab === 'face' ? (
                <div className="w-full max-w-sm mb-4">
                    <FaceCameraPreview ref={faceCameraRef} />
                </div>
            ) : (
                <div className="p-10 bg-accent/5 rounded-full border-4 border-dashed border-accent/20 animate-pulse">
                   <UserIcon className="h-24 w-24 text-accent opacity-40" />
                </div>
            )}
            <Button size="lg" className="w-full max-w-sm h-20 text-2xl font-black shadow-2xl rounded-3xl bg-accent hover:bg-accent/90" onClick={handleFaceScan}>
              <UserIcon className="mr-4 h-8 w-8" />
              Reconocer Rostro
            </Button>
            <p className="text-sm text-center text-muted-foreground font-black uppercase tracking-widest opacity-60 max-w-[280px]">
              Mire directamente a la cámara
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
        <div ref={scannerElementRef} id={QR_SCANNER_ELEMENT_ID} className="w-full rounded-[2rem] border-4 border-primary bg-black overflow-hidden aspect-square sm:aspect-video shadow-2xl transition-all group-hover:border-accent" />
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
        <div className="p-6 bg-white/5 backdrop-blur-sm rounded-[2rem] inline-block border border-green-500/20 shadow-xl min-w-[300px]">
            <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight">{successInfo?.userName}</p>
            <div className="mt-4 pt-4 border-t border-white/10 dark:border-white/5">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('time')}</p>
                <p className="text-2xl font-mono font-black text-green-600 dark:text-green-400">
                    {successInfo?.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
            </div>
        </div>
        <div className="flex flex-col items-center gap-4 mt-6">
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
      <Card className="w-full max-w-2xl mx-auto shadow-2xl glass-card border-t-[12px] border-t-primary overflow-hidden rounded-[3rem] relative">
        <div className="absolute top-6 right-8 font-mono font-black text-xl text-primary/80 tracking-wider">
            {liveTime ? liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : ''}
        </div>
        <CardHeader className="text-center pb-8 border-b border-white/10 bg-muted/5 p-10 mt-6 md:mt-2">
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
  return <Scanner onAttendanceSaved={onAttendanceSaved} onCancel={onCancel || (() => {})} isTerminal={isTerminal} />;
}
