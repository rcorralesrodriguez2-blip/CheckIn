"use client";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { Chatbot } from "./Chatbot";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LanguageProvider>
            <AuthProvider>
                {children}
                <Chatbot />
                <Toaster />
            </AuthProvider>
        </LanguageProvider>
    )
}
