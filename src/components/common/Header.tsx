"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { AdminSidebar } from "./AdminSidebar";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ unreadReportsCount = 0 }: { unreadReportsCount?: number }) {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { user: loggedInUser, logout: handleLogout } = useAuth();
  const { t } = useLanguage();

  const closeSheet = () => setSheetOpen(false);

  const isAdminOrSupervisor = loggedInUser?.role === 'admin' || loggedInUser?.role === 'supervisor';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md shadow-sm transition-all">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4">
            {isAdminOrSupervisor && (
              <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden hover:bg-primary/10">
                    <Menu className="h-7 w-7" />
                    <span className="sr-only">{t('open_menu')}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 border-none">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                      <Logo />
                      <span>Menu</span>
                    </SheetTitle>
                    <SheetDescription>
                      Navigation menu for admin functions
                    </SheetDescription>
                  </SheetHeader>
                  <AdminSidebar onLinkClick={closeSheet} unreadReportsCount={unreadReportsCount} />
                </SheetContent>
              </Sheet>
            )}
            <Link href={loggedInUser ? "/admin" : "/login"} className="flex items-center gap-2 transition-transform hover:scale-105">
              <Logo />
            </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitcher />
          {loggedInUser && (
            <Button variant="outline" size="sm" onClick={handleLogout} className="font-bold border-2 hover:bg-destructive hover:text-white hover:border-destructive transition-all">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
