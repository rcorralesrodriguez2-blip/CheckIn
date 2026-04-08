
"use client";

import { Suspense, useRef } from 'react';
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas } from 'qrcode.react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { useLanguage } from '@/i18n/LanguageContext';

function RegistrationSuccessContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const name = searchParams.get("name") || "N/A";
  const id = searchParams.get("id") || "";
  const qrRef = useRef<HTMLDivElement>(null);

  const qrData = JSON.stringify({ id });

  const handleDownload = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `qr-code-${id}.png`;
        document.body.appendChild(link);
        link.click();
        if (link && document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-headline">{t('registration_successful_title')}</CardTitle>
          <CardDescription>{t('registration_successful_description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="rounded-lg border p-4 shadow-sm" ref={qrRef}>
            <QRCodeCanvas
              value={qrData}
              size={256}
              level={"H"}
            />
          </div>
          <div className="text-left self-stretch bg-muted p-4 rounded-lg">
            <p className="font-semibold text-lg text-foreground">{name}</p>
            <p className="text-muted-foreground">{t('id')}: {id}</p>
          </div>
          <div className="flex w-full flex-col sm:flex-row gap-2">
             <Button onClick={handleDownload} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {t('download_qr_button')}
            </Button>
            <Button asChild className="w-full">
              <Link href="/login">{t('go_to_dashboard_button')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegistrationSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistrationSuccessContent />
    </Suspense>
  );
}
