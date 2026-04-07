"use client";

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Header } from "@/components/common/Header";
import { AdminSidebar } from "@/components/common/AdminSidebar";
import { useAuth } from '@/hooks/use-auth';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);

  const isAdminOrSupervisor = user?.role === 'admin' || user?.role === 'supervisor';

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // @ts-expect-error - injecting props
      return React.cloneElement(child, { setUnreadReportsCount });
    }
    return child;
  });

  if (isAdminOrSupervisor) {
    return (
      <div className="flex min-h-screen flex-col bg-background/50">
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden md:block w-72 border-r glass-card">
            <AdminSidebar unreadReportsCount={unreadReportsCount} />
          </div>
          <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
            <Header unreadReportsCount={unreadReportsCount} />
            <main className="flex-1 p-3 sm:p-6 md:p-10 animate-in fade-in duration-1000">
                <div className="max-w-7xl mx-auto w-full">
                    {childrenWithProps}
                </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
     <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex flex-col p-4 sm:p-8">
          <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
              {children}
          </div>
      </main>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center font-black uppercase tracking-widest text-primary animate-pulse">Iniciando Dashboard...</div>}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
