import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";
import { Providers } from "@/components/common/Providers";
import "./globals.css";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CheckIn",
  description: "QR Code based attendance system.",
  icons: null,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={`font-sans antialiased h-full bg-transparent ${ptSans.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
