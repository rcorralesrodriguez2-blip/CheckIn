"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as React from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { NewUser } from "@/types";
import { Logo } from "@/components/common/Logo";
import { useLanguage } from "@/i18n/LanguageContext";
import { createUser, getUserById } from "@/services/userService";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { captureFingerprint } from "@/services/fingerprintService";
import { Fingerprint, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, isClient } = useLanguage();

  const [currentStep, setCurrentStep] = React.useState<'form' | 'fingerprint'>('form');
  const [fingerprintTemplate, setFingerprintTemplate] = React.useState<string | null>(null);
  const [isCapturingFingerprint, setIsCapturingFingerprint] = React.useState(false);
  const [fingerprintStatus, setFingerprintStatus] = React.useState<'idle' | 'capturing' | 'success' | 'error'>('idle');

  const formSchema = React.useMemo(() => z.object({
    fullName: z.string().min(3, { message: t('validation_fullname_min') }),
    colombianId: z.string().regex(/^[a-zA-Z0-9]+$/, t('validation_id_alphanumeric')).min(5, { message: t('validation_id_min') }),
    password: z.string().min(6, { message: t('validation_password_min') }),
    confirmPassword: z.string()
  }).refine(data => data.password === data.confirmPassword, {
    message: t('validation_password_mismatch'),
    path: ["confirmPassword"],
  }), [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      colombianId: "",
      password: "",
      confirmPassword: ""
    },
  });

  const handleCaptureFingerprint = async () => {
    setFingerprintStatus('capturing');
    setIsCapturingFingerprint(true);

    const result = await captureFingerprint();

    if (result.status === 'success') {
      setFingerprintTemplate(result.template);
      setFingerprintStatus('success');
      toast({
        title: "Huella capturada",
        description: "La huella se ha leído correctamente.",
      });
      
      // Completar el registro automáticamente
      await handleCompleteRegistration(result.template);
    } else {
      setFingerprintStatus('error');
      toast({
        variant: "destructive",
        title: "Error de hardware",
        description: result.message || "No se pudo leer la huella.",
      });
    }
    setIsCapturingFingerprint(false);
  };

  const handleCompleteRegistration = async (template: string) => {
    try {
      const values = form.getValues();
      
      const existingUser = await getUserById(values.colombianId);
      if (existingUser) {
        toast({
          variant: "destructive",
          title: t('registration_failed'),
          description: t('user_exists_error'),
        });
        setFingerprintStatus('idle');
        setFingerprintTemplate(null);
        return;
      }

      const newUser: NewUser = {
        id: values.colombianId,
        fullName: values.fullName,
        role: 'user',
        password: values.password,
        exitLockUntil: null,
        fingerprintTemplate: template,
      };
      
      await createUser(newUser);

      toast({
        title: t('registration_successful'),
        description: t('registration_success_message'),
      });
      
      router.push(`/registration-success?name=${encodeURIComponent(newUser.fullName)}&id=${newUser.id}`);
    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        variant: "destructive",
        title: t('registration_failed'),
        description: "An unexpected error occurred."
      });
      setFingerprintStatus('idle');
      setFingerprintTemplate(null);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const existingUser = await getUserById(values.colombianId);
      if (existingUser) {
        toast({
          variant: "destructive",
          title: t('registration_failed'),
          description: t('user_exists_error'),
        });
        return;
      }

      const newUser: NewUser = {
        id: values.colombianId,
        fullName: values.fullName,
        role: 'user',
        password: values.password,
        exitLockUntil: null,
        fingerprintTemplate: fingerprintTemplate || undefined,
      };
      
      await createUser(newUser);

      toast({
        title: t('registration_successful'),
        description: t('registration_success_message'),
      });
      
      router.push(`/registration-success?name=${encodeURIComponent(newUser.fullName)}&id=${newUser.id}`);
    } catch (error) {
        console.error("Registration failed:", error);
        toast({
            variant: "destructive",
            title: t('registration_failed'),
            description: "An unexpected error occurred."
        })
    }
  }
  
  if (!isClient) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden">
      <div className="absolute top-4 right-4 z-10 animate-in fade-in duration-700">
        <LanguageSwitcher />
      </div>

      {/* Background Decorative Circles */}
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-3xl animate-in zoom-in duration-1000" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-accent/10 rounded-full blur-3xl animate-in zoom-in duration-1000 delay-300" />

       <div className="z-10 w-full max-w-sm animate-in fade-in slide-in-from-top-8 duration-700">
        <div className="mb-8 flex justify-center transition-transform hover:scale-110 duration-500">
          <Logo />
        </div>

        {currentStep === 'form' ? (
          <Card className="w-full glass-card hover-lift">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-center">{t('register_title')}</CardTitle>
              <CardDescription className="text-center">
                {t('register_description')}
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(() => setCurrentStep('fingerprint'))} className="space-y-6">
                <CardContent className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('full_name_label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('full_name_placeholder')} className="bg-background/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="colombianId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('id_card_label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('id_card_placeholder')} className="bg-background/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('password_label')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" className="bg-background/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('confirm_password_label')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" className="bg-background/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardContent>
                  <Button className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" type="submit">
                    Siguiente: Registrar Huella
                  </Button>
                  <div className="mt-4 text-center text-sm">
                    {t('already_have_account')}{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {t('login_here')}
                    </Link>
                  </div>
                </CardContent>
              </form>
            </Form>
          </Card>
        ) : (
          <Card className="w-full glass-card hover-lift">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-center">Registrar Huella Digital</CardTitle>
              <CardDescription className="text-center">
                Coloque su dedo en el lector de huellas para completar el registro
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10 gap-6">
              <div className={`p-10 rounded-full transition-all duration-500 ring-8 ${
                fingerprintStatus === 'capturing' ? 'bg-primary/20 ring-primary/20 animate-pulse' :
                fingerprintStatus === 'success' ? 'bg-green-500/20 ring-green-500/20 scale-110' :
                fingerprintStatus === 'error' ? 'bg-destructive/20 ring-destructive/20' :
                'bg-muted ring-muted/50'
              }`}>
                {fingerprintStatus === 'success' ? (
                  <CheckCircle2 className="h-20 w-20 text-green-500" />
                ) : fingerprintStatus === 'error' ? (
                  <AlertCircle className="h-20 w-20 text-destructive" />
                ) : (
                  <Fingerprint className={`h-20 w-20 ${fingerprintStatus === 'capturing' ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
              </div>
              
              <p className="text-center font-bold text-lg">
                {fingerprintStatus === 'idle' && "Presione el botón para iniciar la captura"}
                {fingerprintStatus === 'capturing' && "Ponga el dedo en el lector..."}
                {fingerprintStatus === 'success' && "Huella registrada correctamente"}
                {fingerprintStatus === 'error' && "Error en el lector de huellas"}
              </p>
            </CardContent>
            <CardContent className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setCurrentStep('form')}
                disabled={isCapturingFingerprint}
              >
                Atrás
              </Button>
              {fingerprintStatus === 'success' ? (
                <Button 
                  className="flex-1" 
                  onClick={form.handleSubmit(onSubmit)}
                >
                  Completar Registro
                </Button>
              ) : (
                <Button 
                  className="flex-1" 
                  onClick={handleCaptureFingerprint}
                  disabled={isCapturingFingerprint}
                >
                  {isCapturingFingerprint && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {fingerprintStatus === 'error' ? "Reintentar" : "Capturar Huella"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}