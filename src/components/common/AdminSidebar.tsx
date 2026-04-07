
"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LayoutDashboard, ListChecks, Users, ScanLine, MessageSquareWarning, Settings, X, Monitor } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function AdminSidebar({ onLinkClick, unreadReportsCount = 0 }: { onLinkClick?: () => void, unreadReportsCount?: number }) {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const activeView = searchParams.get('view') || 'dashboard';

  const navItems = [
    {
      href: 'dashboard',
      label: t('dashboard'),
      icon: LayoutDashboard,
      roles: ['admin', 'supervisor'],
    },
    {
      href: 'attendance',
      label: t('attendance_records'),
      icon: ListChecks,
      roles: ['admin', 'supervisor'],
    },
    {
      href: 'users',
      label: t('registered_users_sidebar'),
      icon: Users,
      roles: ['admin', 'supervisor'],
    },
     {
      href: 'reports',
      label: t('reports_title'),
      icon: MessageSquareWarning,
      roles: ['admin'],
      notificationCount: unreadReportsCount
    },
    {
      href: 'scan',
      label: t('scan_qr'),
      icon: ScanLine,
      roles: ['admin'],
    },
    {
      href: 'settings',
      label: t('settings'),
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className="w-full flex-shrink-0 border-r bg-background h-full flex flex-col shadow-2xl md:shadow-none">
      <div className="flex items-center h-16 border-b px-6 justify-between md:justify-start">
          <Link href="/admin" onClick={onLinkClick}>
              <Logo />
          </Link>
          {onLinkClick && (
              <Button variant="ghost" size="icon" onClick={onLinkClick} className="md:hidden">
                  <X className="h-6 w-6" />
              </Button>
          )}
      </div>
      <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <Link 
            href={`/admin?view=${item.href}`} 
            key={item.href} 
            onClick={onLinkClick}
            className="w-full"
          >
            <Button
              variant={activeView === item.href ? 'default' : 'ghost'}
              className={cn(
                  "w-full justify-start h-12 text-sm font-bold uppercase tracking-tight rounded-xl transition-all",
                  activeView === item.href ? "shadow-lg scale-[1.02]" : "hover:bg-primary/5 hover:translate-x-1"
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5", activeView === item.href ? "text-white" : "text-primary")} />
              <span className="flex-1 text-left">{item.label}</span>
               {item.notificationCount && item.notificationCount > 0 && (
                  <Badge className="h-6 min-w-6 bg-accent text-accent-foreground font-black animate-pulse rounded-full border-none">{item.notificationCount}</Badge>
               )}
            </Button>
          </Link>
        ))}

        <div className="my-4 px-2">
           <div className="h-px bg-border w-full mb-4" />
           <Link href="/terminal" target="_blank">
              <Button variant="outline" className="w-full justify-start border-primary/40 hover:bg-primary/10 text-primary font-black uppercase tracking-tighter rounded-xl h-14">
                 <Monitor className="mr-3 h-5 w-5" />
                 Modo Terminal
              </Button>
           </Link>
        </div>
      </nav>
      <div className="p-6 border-t bg-muted/5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">CheckIn v1.0.0</p>
      </div>
    </aside>
  );
}
