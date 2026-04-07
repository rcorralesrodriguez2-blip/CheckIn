
import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/common/Providers";

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
    <html className="h-full" lang="en">
      <body className={`font-sans antialiased h-full bg-transparent ${ptSans.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
