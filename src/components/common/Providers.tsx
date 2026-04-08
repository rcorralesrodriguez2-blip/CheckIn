"use client";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { Chatbot } from "./Chatbot";
import { useRemoveChildErrorHandler } from "@/hooks/useRemoveChildErrorHandler";

function ProvidersContent({ children }: { children: React.ReactNode }) {
    useRemoveChildErrorHandler();
    
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

export function Providers({ children }: { children: React.ReactNode }) {
    return <ProvidersContent>{children}</ProvidersContent>;
}
