
"use client";

import { useState, useEffect } from "react";
import { ScannerWrapper } from "@/components/scan/Scanner";
import { Header } from "@/components/common/Header";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Monitor, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";

export default function TerminalPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const canAccess = user?.role === 'admin' || user?.role === 'supervisor';

  if (!canAccess) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center bg-background">
        <div className="p-8 glass-card border-t-8 border-t-destructive max-w-md w-full">
            <h1 className="text-3xl font-black uppercase text-destructive mb-4">Acceso Denegado</h1>
            <p className="text-muted-foreground font-bold text-lg leading-relaxed">Solo el personal de seguridad o administración puede activar este terminal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 relative overflow-hidden">
        {/* Fondo decorativo exclusivo para terminal */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-40">
           <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-primary/30 rounded-full blur-[150px] animate-pulse" />
           <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-accent/30 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '3s' }} />
        </div>

        <div className="max-w-3xl w-full space-y-12">
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-8 duration-1000">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-primary/10 border-2 border-primary/20 text-primary text-sm font-black uppercase tracking-[0.3em] mb-4">
              <ShieldCheck size={20} className="animate-pulse" />
              Terminal de Seguridad Activo
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase font-headline leading-tight">
              Control de <span className="text-primary">Acceso</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-bold max-w-xl mx-auto opacity-80">
              Use su huella digital o acerque su código QR a la cámara para registrarse.
            </p>
          </div>

          <div className="animate-in zoom-in duration-700 delay-300">
             <ScannerWrapper 
                isTerminal={true}
                onAttendanceSaved={() => {
                  // El scanner se auto-resetea internamente en modo terminal
                }} 
             />
          </div>

          <Card className="glass-card bg-white/5 border-none shadow-none max-w-sm mx-auto">
            <CardContent className="p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
              <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500 animate-ping" /> Sistema Online</span>
              <span>CheckIn Pro v1.0</span>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
