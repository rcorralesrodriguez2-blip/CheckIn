
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { QRCodeCanvas } from 'qrcode.react';
import { User, AttendanceRecord, Message, AppMode, AppSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { User as UserIcon, CalendarClock, QrCode as QrCodeIcon, Users, ListChecks, Download, Trash2, LogIn, LogOut, Loader2, ScanLine, History, MoreVertical, ShieldCheck, UserCheck, Lock, MessageCircleWarning, Sparkles, Settings as SettingsIcon, Building, School, Fingerprint, UserPlus, UserCog, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { deleteUserById, onUsersUpdate, updateUserRole, setUserExitLock, getUserById } from "@/services/userService";
import { getAttendanceRecords, onUserAttendanceRecordsUpdate, updateAttendanceRecord, getUserAttendanceRecords } from "@/services/attendanceService";
import { onReportsUpdate, updateReportStatus } from "@/services/reportService";
import { onSettingsUpdate, updateAppMode } from "@/services/settingsService";
import { parseTimestamp } from "@/lib/date";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { SetExitLockDialog } from "@/components/admin/SetExitLockDialog";
import { RegisterFingerprintDialog } from "@/components/admin/RegisterFingerprintDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { analyzeAttendance } from "@/ai/flows/attendanceAnalyzerFlow";
import { analyzeGlobalAttendance } from "@/ai/flows/globalAttendanceAnalysisFlow";
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Carga dinámica de componentes pesados para mejorar la velocidad inicial
const DashboardCharts = dynamic(() => import('@/components/admin/DashboardCharts'), {
  ssr: false,
  loading: () => <div className="h-[250px] w-full flex items-center justify-center bg-muted/10 rounded-xl animate-pulse"><Loader2 className="animate-spin opacity-20" /></div>,
});

const ScannerWrapper = dynamic(() => import('@/components/scan/Scanner').then(mod => mod.ScannerWrapper), {
  ssr: false,
  loading: () => <div className="flex flex-col items-center justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>,
});

type EnrichedAttendanceRecord = AttendanceRecord & { userName: string; userPhoto?: string };

const recordsToJson = (records: AttendanceRecord[]): any[] => {
    return records.map(record => {
      let timestamp;
      const parsed = parseTimestamp(record.timestamp);
      if (parsed) {
        timestamp = parsed.toISOString();
      } else {
        timestamp = record.timestamp;
      }
      return { ...record, timestamp };
    });
};

function DashboardPageContent({ setUnreadReportsCount }: { setUnreadReportsCount?: (count: number) => void }) {
  const { user: loggedInUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeView = searchParams.get('view') || 'dashboard';
  
  const [users, setUsers] = useState<User[]>([]);
  const [allAttendance, setAllAttendance] = useState<EnrichedAttendanceRecord[]>([]);
  const [userAttendance, setUserAttendance] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<Message[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ appMode: 'corporate' });
  const [loading, setLoading] = useState(true);
  const [editingObservation, setEditingObservation] = useState<{ [key: string]: string }>({});
  const [savingObservation, setSavingObservation] = useState<string | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [userSearch, setUserSearch] = useState('');

  const [selectedUserHistory, setSelectedUserHistory] = useState<AttendanceRecord[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [isExitLockDialogOpen, setIsExitLockDialogOpen] = useState(false);
  const [selectedUserForLock, setSelectedUserForLock] = useState<User | null>(null);
  
  const [isFingerprintModalOpen, setIsFingerprintModalOpen] = useState(false);
  const [selectedUserForFinger, setSelectedUserForFinger] = useState<User | null>(null);

  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);

  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [globalAnalysisResult, setGlobalAnalysisResult] = useState<string | null>(null);
  const [isGlobalAnalyzing, setIsGlobalAnalyzing] = useState(false);

  useEffect(() => {
    if (!loggedInUser) return;
    
    let unsubSettings: () => void = () => {};
    let unsubUsers: () => void = () => {};
    let unsubAttendance: () => void = () => {};
    let unsubUserAttendance: () => void = () => {};
    let unsubReports: () => void = () => {};
    
    const setupSubscriptions = async () => {
      unsubSettings = await onSettingsUpdate(setAppSettings);
      
      if (loggedInUser.role === 'admin' || loggedInUser.role === 'supervisor') {
        unsubUsers = await onUsersUpdate(setUsers);
        unsubAttendance = await getAttendanceRecords(setAllAttendance);
        if (loggedInUser.role === 'admin') {
          unsubReports = await onReportsUpdate((updatedReports) => {
              setReports(updatedReports);
              if(setUnreadReportsCount) {
                  const unreadCount = updatedReports.filter(r => r.status === 'new').length;
                  setUnreadReportsCount(unreadCount);
              }
          });
        }
      } else {
        unsubUserAttendance = await onUserAttendanceRecordsUpdate(loggedInUser.id, setUserAttendance);
      }
      
      setLoading(false);
    };
    
    setupSubscriptions();

    return () => {
      unsubSettings();
      unsubUsers();
      unsubAttendance();
      unsubUserAttendance();
      unsubReports();
    }
  }, [loggedInUser, setUnreadReportsCount]);

  const handleModeChange = async (mode: AppMode) => {
    try {
      await updateAppMode(mode);
      toast({
        title: t('settings_updated'),
        description: t('app_mode_changed_to', { mode: t(mode) }),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: t('settings_update_failed'),
      });
    }
  };

  const handleAnalyzeGlobal = async () => {
    setIsGlobalAnalyzing(true);
    setGlobalAnalysisResult(null);
    try {
      const jsonRecords = recordsToJson(allAttendance);
      const jsonUsers = users.map(u => ({ id: u.id, fullName: u.fullName, role: u.role }));
      const result = await analyzeGlobalAttendance({
        users: jsonUsers,
        records: jsonRecords,
        appMode: appSettings.appMode
      });
      setGlobalAnalysisResult(result.analysis);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('analysis_failed_title'),
        description: t('analysis_failed_description'),
      });
    } finally {
      setIsGlobalAnalyzing(false);
    }
  };

  const handleMarkAsRead = async (reportId: string) => {
    try {
        await updateReportStatus(reportId, 'read');
    } catch (error) {
        toast({
            variant: "destructive",
            title: t('error_title'),
            description: t('mark_as_read_failed'),
        });
    }
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'supervisor' | 'user') => {
      try {
          await updateUserRole(userId, role);
          toast({
              title: t('role_updated_title'),
              description: t('role_updated_description', { role: t(role) }),
          });
      } catch (error) {
          toast({
              variant: "destructive",
              title: t('error_title'),
              description: t('role_update_failed'),
          });
      }
  };

  const handleSetExitLock = async (userId: string, lockUntil: Date | null) => {
      try {
          await setUserExitLock(userId, lockUntil);
          toast({
              title: t('exit_lock_updated_title'),
              description: lockUntil 
                ? t('exit_lock_set_description', { time: format(lockUntil, 'PPP p') })
                : t('exit_lock_removed_description'),
          });
          setIsExitLockDialogOpen(false);
      } catch (error) {
           toast({
              variant: "destructive",
              title: t('error_title'),
              description: t('exit_lock_failed'),
          });
      }
  };

  const attendanceWithTardiness = useMemo(() => {
    if (allAttendance.length === 0) return [];

    const userDayGroups: { [userId: string]: { [day: string]: EnrichedAttendanceRecord[] } } = {};
    allAttendance.forEach(record => {
      const parsedDate = parseTimestamp(record.timestamp);
      const day = parsedDate ? format(parsedDate, 'yyyy-MM-dd') : 'unknown';
      if (!userDayGroups[record.userId]) userDayGroups[record.userId] = {};
      if (!userDayGroups[record.userId][day]) userDayGroups[record.userId][day] = [];
      userDayGroups[record.userId][day].push(record);
    });

    return allAttendance.map(record => {
      let tardinessMinutes: number | null = null;
      if (record.type === 'entry') {
        const parsedDate = parseTimestamp(record.timestamp);
        if (!parsedDate) return { ...record, tardiness: tardinessMinutes };
        const day = format(parsedDate, 'yyyy-MM-dd');
        const userDayRecords = userDayGroups[record.userId]?.[day] || [];
        
        const firstEntry = userDayRecords
          .filter(r => r.type === 'entry')
          .sort((a, b) => {
            const aDate = parseTimestamp(a.timestamp);
            const bDate = parseTimestamp(b.timestamp);
            return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
          })[0];

        if (firstEntry && firstEntry.id === record.id) {
          const entryTime = parseTimestamp(firstEntry.timestamp);
          if (entryTime) {
            const workdayStart = new Date(entryTime);
            workdayStart.setHours(9, 0, 0, 0);

            if (entryTime > workdayStart) {
              tardinessMinutes = differenceInMinutes(entryTime, workdayStart);
            } else {
              tardinessMinutes = 0;
            }
          }
        }
      }
      return { ...record, tardiness: tardinessMinutes };
    });
  }, [allAttendance]);

  const filteredAttendance = useMemo(() => {
    return attendanceWithTardiness.filter(record => {
      const nameMatch = (record.userName ?? '').toLowerCase().includes(nameFilter.toLowerCase());
      const parsedDate = parseTimestamp(record.timestamp);
      const dateMatch = !dateFilter || (parsedDate && format(parsedDate, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd'));
      return nameMatch && dateMatch;
    });
  }, [attendanceWithTardiness, nameFilter, dateFilter]);
  const filteredUsers = useMemo(() => {
    return users.filter(user => user.fullName.toLowerCase().includes(userSearch.toLowerCase()));
  }, [users, userSearch]);
  
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), i);
      return { date: format(d, 'yyyy-MM-dd'), name: format(d, 'MMM dd'), total: 0 };
    }).reverse();

    allAttendance.forEach(record => {
      const parsedDate = parseTimestamp(record.timestamp);
      const recordDate = parsedDate ? format(parsedDate, 'yyyy-MM-dd') : null;
      const dayData = last7Days.find(d => d.date === recordDate);
      if (dayData) {
        dayData.total++;
      }
    });

    return last7Days;
  }, [allAttendance]);

  const topUsersData = useMemo(() => {
    const userCounts: { [name: string]: number } = {};
    allAttendance.forEach(record => {
      userCounts[record.userName] = (userCounts[record.userName] || 0) + 1;
    });
    
    return Object.entries(userCounts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [allAttendance]);

  const getQrData = (id: string) => JSON.stringify({ id });
  
  const handleDownload = (userId: string) => {
    const qrNode = document.getElementById(`qr-code-${userId}`);
    if (qrNode) {
      const canvas = qrNode.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `qr-code-${userId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUserById(userId);
    toast({
      title: t('user_deleted_title'),
      description: t('user_deleted_description', { userId }),
    });
  };

  const handleObservationChange = (recordId: string, value: string) => {
    setEditingObservation(prev => ({ ...prev, [recordId]: value }));
  };

  const handleSaveObservation = async (recordId: string) => {
    if (!recordId) return;
    setSavingObservation(recordId);
    const observationText = editingObservation[recordId] ?? '';
    await updateAttendanceRecord(recordId, { observations: observationText });
    
    setSavingObservation(null);
    setEditingObservation(prev => {
        const newState = { ...prev };
        delete newState[recordId];
        return newState;
    });
  };
  
  const handleViewHistory = async (user: User) => {
    setHistoryLoading(true);
    setSelectedUserName(user.fullName);
    setIsHistoryModalOpen(true);
    setAnalysisResult(null);
    const records = await getUserAttendanceRecords(user.id);
    setSelectedUserHistory(records);
    setHistoryLoading(false);
  };
  
  const handleAnalyzeHistory = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const jsonRecords = recordsToJson(selectedUserHistory);
      const result = await analyzeAttendance(jsonRecords);
      setAnalysisResult(result.analysis);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('analysis_failed_title'),
        description: t('analysis_failed_description'),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleOpenLockDialog = async (userId: string) => {
      const user = await getUserById(userId);
      if (user) {
          setSelectedUserForLock(user);
          setIsExitLockDialogOpen(true);
      }
  };
  
  const handleOpenFingerprintDialog = async (user: User) => {
      setSelectedUserForFinger(user);
      setIsFingerprintModalOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUserForEdit(user);
    setIsEditUserOpen(true);
  };

  const onAttendanceSaved = () => {
    router.push('/admin?view=attendance');
  };

  const todaysAttendanceCount = allAttendance.filter(a => {
      const recordDate = parseTimestamp(a.timestamp);
      return recordDate && format(recordDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  }).length;

  const modeTerms = {
    users: appSettings.appMode === 'school' ? t('registered_students') : t('registered_employees'),
    usersDesc: appSettings.appMode === 'school' ? t('registered_students_description') : t('registered_employees_description'),
    totalUsers: appSettings.appMode === 'school' ? t('total_students') : t('total_employees'),
  };

  if (loading || !loggedInUser) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }
  
  if (loggedInUser.role === 'admin' || loggedInUser.role === 'supervisor') {
    return (
      <div className="w-full animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
            <div>
                <h1 className="text-4xl font-black mb-2 font-headline tracking-tight">{t('admin_dashboard_title')}</h1>
                <p className="text-muted-foreground text-lg">{t('admin_dashboard_description')}</p>
            </div>
            <Badge variant="outline" className="flex items-center gap-2 px-4 py-2 border-primary/20 bg-primary/5 text-primary font-black uppercase tracking-widest animate-pulse">
                <Activity size={16} />
                Sistema en Tiempo Real
            </Badge>
        </div>
        
        {activeView === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="glass-card hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{modeTerms.totalUsers}</CardTitle>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black tracking-tighter">{users.length}</div>
                </CardContent>
              </Card>
              <Card className="glass-card hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('total_attendance')}</CardTitle>
                  <div className="p-2 bg-accent/10 rounded-full">
                    <ListChecks className="h-5 w-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black tracking-tighter">{allAttendance.length}</div>
                </CardContent>
              </Card>
              <Card className="glass-card hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('todays_attendance')}</CardTitle>
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <CalendarClock className="h-5 w-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black tracking-tighter">{todaysAttendanceCount}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={handleAnalyzeGlobal} disabled={isGlobalAnalyzing || allAttendance.length === 0} className="font-bold shadow-lg">
                {isGlobalAnalyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                {t('analyze_global_with_ai')}
              </Button>
            </div>

            {globalAnalysisResult && (
              <Alert className="glass-card border-primary/40 animate-in slide-in-from-right-4 duration-500">
                <Sparkles className="h-5 w-5 text-primary" />
                <AlertTitle className="text-lg font-bold">{t('global_ai_analysis_title')}</AlertTitle>
                <AlertDescriptionComponent>
                   <div className="prose prose-sm dark:prose-invert max-w-none">
                     <pre className="whitespace-pre-wrap font-sans text-sm mt-2 font-medium leading-relaxed">{globalAnalysisResult}</pre>
                   </div>
                </AlertDescriptionComponent>
              </Alert>
            )}
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 glass-card">
                  <CardHeader>
                    <CardTitle className="font-bold">{t('attendance_last_7_days_title')}</CardTitle>
                    <CardDescription>{t('attendance_last_7_days_description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DashboardCharts 
                        type="bar" 
                        data={chartData} 
                        dataKey="total" 
                        nameKey="name" 
                        color="hsl(var(--primary))" 
                    />
                  </CardContent>
                </Card>
                <Card className="lg:col-span-3 glass-card">
                  <CardHeader>
                    <CardTitle className="font-bold">{t('top_5_active_users_title')}</CardTitle>
                    <CardDescription>{t('top_5_active_users_description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DashboardCharts 
                        type="horizontalBar" 
                        data={topUsersData} 
                        dataKey="total" 
                        nameKey="name" 
                        color="hsl(var(--accent))" 
                    />
                  </CardContent>
                </Card>
            </div>
          </div>
        )}

        {activeView === 'attendance' && (
           <Card className="glass-card animate-in fade-in duration-500">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-2xl font-bold">{t('attendance_records')}</CardTitle>
                        <Badge className="bg-green-500/20 text-green-600 border-none font-black text-[10px] uppercase tracking-widest">En Vivo</Badge>
                    </div>
                    <CardDescription>{t('attendance_records_description')}</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                     <div className="relative">
                      <Input
                        placeholder={t('filter_by_name')}
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="pl-9 h-11 bg-background/50"
                      />
                      <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                     <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          size="lg"
                          className={cn(
                            "w-full sm:w-[240px] justify-start text-left font-bold glass-card",
                            !dateFilter && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-5 w-5" />
                          {dateFilter ? format(dateFilter, "PPP") : <span>{t('pick_a_date')}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFilter}
                          onSelect={setDateFilter}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold">{t('photo')}</TableHead>
                      <TableHead className="font-bold">{t('full_name')}</TableHead>
                      <TableHead className="font-bold">{t('id')}</TableHead>
                      <TableHead className="font-bold">{t('date')}</TableHead>
                      <TableHead className="font-bold">{t('time')}</TableHead>
                      <TableHead className="font-bold">{t('type')}</TableHead>
                      <TableHead className="font-bold">{t('tardiness')}</TableHead>
                      <TableHead className="font-bold">Método</TableHead>
                      <TableHead className="w-[250px] font-bold">{t('observations')}</TableHead>
                      <TableHead className="text-right font-bold">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.length > 0 ? (
                      filteredAttendance.map((record) => (
                        <TableRow key={record.id} className="transition-colors group hover:bg-muted/30">
                          <TableCell>
                            {record.userPhoto ? (
                              <Image src={record.userPhoto} alt={`Photo of ${record.userName}`} width={44} height={44} className="rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all" data-ai-hint="person face" />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
                                  <UserIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-bold">{record.userName}</TableCell>
                          <TableCell className="font-mono text-xs opacity-70">{record.userId}</TableCell>
                          <TableCell className="whitespace-nowrap">{parseTimestamp(record.timestamp) ? format(parseTimestamp(record.timestamp)!, 'PPP') : 'Invalid date'}</TableCell>
                          <TableCell className="font-medium">{parseTimestamp(record.timestamp) ? format(parseTimestamp(record.timestamp)!, 'p') : 'Invalid time'}</TableCell>
                          <TableCell>
                            <Badge variant={record.type === 'entry' ? 'default' : 'secondary'} className="capitalize font-black tracking-tighter flex items-center gap-1.5 w-fit h-7">
                              {record.type === 'entry' ? <LogIn size={14}/> : <LogOut size={14}/>}
                              {t(record.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                              {record.tardiness !== null ? (
                                  <Badge variant={record.tardiness > 0 ? 'destructive' : 'default'} className="font-bold h-7">
                                      {t('tardiness_minutes', { minutes: record.tardiness.toString() })}
                                  </Badge>
                              ) : (
                                  <span className="text-muted-foreground">-</span>
                              )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 font-bold">
                              {record.method === 'fingerprint' ? <Fingerprint size={12}/> : <QrCodeIcon size={12}/>}
                              {record.method === 'fingerprint' ? 'Huella' : 'QR'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={editingObservation[record.id!] ?? record.observations ?? ''}
                                    onChange={(e) => handleObservationChange(record.id!, e.target.value)}
                                    onBlur={() => handleSaveObservation(record.id!)}
                                    placeholder={t('add_observations_placeholder')}
                                    className="h-9 bg-background/30 focus:bg-background/80"
                                    disabled={savingObservation === record.id}
                                />
                                {savingObservation === record.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                              {loggedInUser.role === 'admin' && (
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="hover:bg-primary/10 transition-colors">
                                          <MoreVertical className="h-4 w-4" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="glass-card">
                                      <DropdownMenuItem onClick={() => handleOpenLockDialog(record.userId)} className="font-bold">
                                          <Lock className="mr-2 h-4 w-4" />
                                          <span>{t('set_exit_lock')}</span>
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center h-48 opacity-50 font-medium italic">{t('no_attendance_records')}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        )}
                
        {activeView === 'users' && (
          <Card className="glass-card animate-in fade-in duration-500">
              <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-2xl font-bold">{modeTerms.users}</CardTitle>
                        <Badge className="bg-green-500/20 text-green-600 border-none font-black text-[10px] uppercase tracking-widest">En Vivo</Badge>
                      </div>
                      <CardDescription>{modeTerms.usersDesc}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Input
                            placeholder={t('filter_by_name')}
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="pl-9 h-11 bg-background/50"
                        />
                         <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      <Button onClick={() => setIsCreateUserOpen(true)} className="h-11 font-black px-6 shadow-lg">
                        <UserPlus className="mr-2 h-5 w-5" />
                        <span className="hidden sm:inline">{t('create_user_button')}</span>
                      </Button>
                    </div>
                  </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold">{t('full_name')}</TableHead>
                      <TableHead className="font-bold">{t('id')}</TableHead>
                      <TableHead className="font-bold">{t('password')}</TableHead>
                      <TableHead className="font-bold">{t('role')}</TableHead>
                      <TableHead className="font-bold">{t('status')}</TableHead>
                      <TableHead className="font-bold">Huella</TableHead>
                      <TableHead className="text-right font-bold">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} className="group transition-colors hover:bg-muted/30">
                          <TableCell className="font-bold">{user.fullName}</TableCell>
                          <TableCell className="font-mono text-xs opacity-70">{user.id}</TableCell>
                          <TableCell className="text-muted-foreground select-all">{user.password}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'supervisor' ? 'secondary' : 'outline'} className="capitalize font-black tracking-tight">
                              {t(user.role)}
                            </Badge>
                          </TableCell>
                           <TableCell>
                            {user.exitLockUntil && user.exitLockUntil > new Date() ? (
                              <Badge variant="outline" className="flex items-center gap-2 text-amber-600 border-amber-600/30 bg-amber-600/5 font-bold">
                                <Lock className="h-3 w-3" />
                                <span className="text-[10px]">{t('locked_for_time', { time: formatDistanceToNow(user.exitLockUntil) })}</span>
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                             {user.fingerprintTemplate ? (
                               <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                 <Fingerprint size={12} className="mr-1"/> Registrada
                               </Badge>
                             ) : (
                               <Badge variant="outline" className="opacity-50">Sin Huella</Badge>
                             )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                             <Button variant="outline" size="sm" onClick={() => handleViewHistory(user)} className="font-bold glass-card hover-lift">
                              <History className="mr-2 h-4 w-4" /> {t('view_history')}
                            </Button>
                             <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="font-bold glass-card hover-lift">
                                  <QrCodeIcon className="mr-2 h-4 w-4" /> {t('view_qr')}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md glass-card">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-black">{user.fullName}</DialogTitle>
                                </DialogHeader>
                                <div id={`qr-code-${user.id}`} className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner animate-in zoom-in duration-500">
                                  <QRCodeCanvas value={getQrData(user.id)} size={240} level="H" />
                                  <p className="mt-4 font-mono font-bold text-black/50">{t('id')}: {user.id}</p>
                                </div>
                                <Button onClick={() => handleDownload(user.id)} className="w-full mt-4 font-bold" size="lg">
                                    <Download className="mr-2 h-5 w-5"/> {t('download_qr_code')}
                                </Button>
                              </DialogContent>
                            </Dialog>
                            {loggedInUser.role === 'admin' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="glass-card">
                                  <DropdownMenuItem onClick={() => handleOpenEditDialog(user)} className="font-bold">
                                    <UserCog className="mr-2 h-4 w-4" />
                                    <span>{t('edit_user_button')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenFingerprintDialog(user)} className="font-bold">
                                    <Fingerprint className="mr-2 h-4 w-4" />
                                    <span>Vincular Huella</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')} className="font-bold">
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    <span>{t('make_admin')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'supervisor')} className="font-bold">
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    <span>{t('make_supervisor')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'user')} className="font-bold">
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>{t('make_user')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/10" />
                                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => handleDeleteUser(user.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>{t('delete_user')}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-48 opacity-50 italic">{t('no_users_registered')}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        )}

        {activeView === 'settings' && loggedInUser.role === 'admin' && (
          <Card className="glass-card animate-in slide-in-from-bottom-8 duration-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-black"><SettingsIcon className="animate-spin-slow" /> {t('app_settings')}</CardTitle>
              <CardDescription className="text-lg">{t('app_settings_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <Label className="text-xl font-black tracking-tight">{t('application_mode')}</Label>
                <RadioGroup 
                  value={appSettings.appMode} 
                  onValueChange={(val) => handleModeChange(val as AppMode)}
                  className="grid gap-6 md:grid-cols-2"
                >
                  <div className="hover-lift">
                    <RadioGroupItem value="corporate" id="corporate" className="peer sr-only" />
                    <Label
                      htmlFor="corporate"
                      className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-background/30 backdrop-blur-sm p-6 cursor-pointer hover:bg-accent/10 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary"
                    >
                      <Building className="mb-4 h-10 w-10 text-primary" />
                      <span className="text-xl font-black uppercase tracking-tighter">{t('corporate')}</span>
                      <span className="text-center text-sm text-muted-foreground mt-3 leading-relaxed font-medium">{t('corporate_mode_desc')}</span>
                    </Label>
                  </div>
                  <div className="hover-lift">
                    <RadioGroupItem value="school" id="school" className="peer sr-only" />
                    <Label
                      htmlFor="school"
                      className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-background/30 backdrop-blur-sm p-6 cursor-pointer hover:bg-accent/10 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary"
                    >
                      <School className="mb-4 h-10 w-10 text-accent" />
                      <span className="text-xl font-black uppercase tracking-tighter">{t('school')}</span>
                      <span className="text-center text-sm text-muted-foreground mt-3 leading-relaxed font-medium">{t('school_mode_desc')}</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeView === 'scan' && loggedInUser.role === 'admin' && (
           <div className="flex items-center justify-center p-4">
                <ScannerWrapper 
                  onAttendanceSaved={onAttendanceSaved} 
                  onCancel={() => {
                    router.push('/admin?view=attendance');
                  }}
                />
            </div>
        )}

        {activeView === 'reports' && (
            <Card className="glass-card animate-in fade-in duration-500">
                <CardHeader>
                    <CardTitle className="text-2xl font-black">{t('reports_title')}</CardTitle>
                    <CardDescription>{t('reports_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {reports.length > 0 ? (
                      reports.map(report => (
                        <Card key={report.id} className={cn("glass-card border-l-8 transition-all hover-lift", report.status === 'new' ? 'border-l-primary' : 'border-l-muted opacity-80')}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-xl font-black">{report.userName}</CardTitle>
                                <CardDescription className="font-mono text-xs font-bold">{t('id')}: {report.userId}</CardDescription>
                              </div>
                               <Badge variant={report.status === 'new' ? 'default' : 'outline'} className="font-black uppercase text-[10px] tracking-widest">{t(report.status)}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 font-bold">
                                <CalendarClock size={12}/>
                                {parseTimestamp(report.timestamp) ? format(parseTimestamp(report.timestamp)!, 'PPP p') : 'Invalid date'}
                             </div>
                             <p className="text-base font-medium leading-relaxed bg-background/30 p-4 rounded-xl">{report.message}</p>
                          </CardContent>
                           {report.status === 'new' && (
                              <CardFooter className="pt-0">
                                <Button size="sm" onClick={() => handleMarkAsRead(report.id!)} className="font-bold w-full sm:w-auto">{t('mark_as_read')}</Button>
                              </CardFooter>
                           )}
                        </Card>
                      ))
                    ) : (
                       <div className="text-center text-muted-foreground py-20 animate-in zoom-in duration-700">
                           <div className="p-6 bg-muted/20 rounded-full inline-block mb-6 ring-4 ring-muted/10">
                             <MessageCircleWarning className="h-16 w-16 opacity-30" />
                           </div>
                           <p className="text-2xl font-black tracking-tighter">{t('no_messages_yet')}</p>
                           <p className="text-lg font-medium opacity-60 mt-1">{t('no_messages_description')}</p>
                       </div>
                    )}
                </CardContent>
            </Card>
        )}

        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
            <DialogContent className="sm:max-w-3xl glass-card border-t-8 border-t-primary">
                <DialogHeader>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <DialogTitle className="text-2xl font-black tracking-tight">{t('user_attendance_history', { name: selectedUserName })}</DialogTitle>
                      <DialogDescription className="font-medium">{t('user_attendance_history_description', { name: selectedUserName })}</DialogDescription>
                    </div>
                    <Button 
                      size="lg" 
                      variant="default" 
                      onClick={handleAnalyzeHistory}
                      disabled={isAnalyzing || selectedUserHistory.length === 0}
                      className="font-bold shadow-lg"
                    >
                      {isAnalyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                      {t('analyze_with_ai')}
                    </Button>
                  </div>
                </DialogHeader>
                <div className="max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center p-8 text-primary animate-pulse">
                        <Loader2 className="h-12 w-12 animate-spin mb-4" />
                        <span className="text-lg font-black uppercase tracking-widest">{t('generating_analysis')}</span>
                    </div>
                  )}
                  {analysisResult && (
                    <Alert className="mb-6 border-l-8 border-l-accent glass-card animate-in slide-in-from-top-4 duration-500">
                      <Sparkles className="h-6 w-6 text-accent" />
                      <AlertTitle className="text-lg font-black mb-2">{t('ai_analysis_title')}</AlertTitle>
                      <AlertDescriptionComponent>
                          <pre className="whitespace-pre-wrap font-sans text-base font-medium leading-relaxed">{analysisResult}</pre>
                      </AlertDescriptionComponent>
                    </Alert>
                  )}
                  {historyLoading ? (
                      <div className="flex justify-center items-center h-64">
                          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      </div>
                  ) : (
                      <div className="rounded-xl border border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="font-bold">{t('date')}</TableHead>
                                    <TableHead className="font-bold">{t('time')}</TableHead>
                                    <TableHead className="font-bold">{t('type')}</TableHead>
                                    <TableHead className="font-bold">{t('observations')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {selectedUserHistory.length > 0 ? (
                                selectedUserHistory.map((record) => (
                                <TableRow key={record.id} className="group hover:bg-muted/20 transition-colors">
                                    <TableCell className="font-medium whitespace-nowrap">{parseTimestamp(record.timestamp) ? format(parseTimestamp(record.timestamp)!, 'PPP') : 'Invalid date'}</TableCell>
                                    <TableCell className="font-bold">{parseTimestamp(record.timestamp) ? format(parseTimestamp(record.timestamp)!, 'p') : 'Invalid time'}</TableCell>
                                    <TableCell>
                                    <Badge variant={record.type === 'entry' ? 'default' : 'secondary'} className="capitalize font-black flex items-center gap-1.5 w-fit h-7">
                                        {record.type === 'entry' ? <LogIn size={14}/> : <LogOut size={14}/>}
                                        {t(record.type)}
                                    </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-medium italic">{record.observations || "-"}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={4} className="text-center h-48 opacity-50 italic">{t('no_attendance_records_yet')}</TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                      </div>
                  )}
                </div>
            </DialogContent>
        </Dialog>
        <SetExitLockDialog
          isOpen={isExitLockDialogOpen}
          onOpenChange={setIsExitLockDialogOpen}
          user={selectedUserForLock}
          onConfirm={handleSetExitLock}
        />
        <RegisterFingerprintDialog
          isOpen={isFingerprintModalOpen}
          onOpenChange={setIsFingerprintModalOpen}
          user={selectedUserForFinger}
        />
        <CreateUserDialog
          isOpen={isCreateUserOpen}
          onOpenChange={setIsCreateUserOpen}
        />
        <EditUserDialog
          isOpen={isEditUserOpen}
          onOpenChange={setIsEditUserOpen}
          user={selectedUserForEdit}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-5xl font-black mb-2 font-headline tracking-tighter text-primary">{t('user_dashboard_title')}</h1>
          <p className="text-xl font-medium text-muted-foreground">{t('welcome')}, <span className="text-foreground font-black underline decoration-accent decoration-4 underline-offset-4">{loggedInUser.fullName}</span>. {t('user_dashboard_description')}</p>
        </div>
        <div className="p-4 glass-card rounded-2xl animate-in slide-in-from-right-8 duration-1000">
            <Badge variant="outline" className="text-lg px-4 py-2 border-primary/20 bg-primary/5 text-primary font-black uppercase tracking-tighter">
                ID: {loggedInUser.id}
            </Badge>
        </div>
      </div>
      
      <Tabs defaultValue="my-attendance" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 md:w-[480px] h-14 p-1.5 glass-card rounded-2xl">
          <TabsTrigger value="my-attendance" className="text-base font-black uppercase tracking-tight rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">{t('my_attendance')}</TabsTrigger>
          <TabsTrigger value="my-qr" className="text-base font-black uppercase tracking-tight rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">{t('my_qr_code')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-attendance" className="animate-in fade-in slide-in-from-left-4 duration-500">
          <Card className="glass-card shadow-2xl border-t-8 border-t-primary overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-3xl font-black tracking-tight">{t('my_attendance_records')}</CardTitle>
                    <CardDescription className="text-lg font-medium">{t('my_attendance_records_description')}</CardDescription>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-bold text-base h-12">{t('date')}</TableHead>
                          <TableHead className="font-bold text-base h-12">{t('time')}</TableHead>
                          <TableHead className="font-bold text-base h-12">{t('type')}</TableHead>
                          <TableHead className="font-bold text-base h-12">{t('observations')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userAttendance.length > 0 ? (
                          userAttendance.map((record) => (
                            <TableRow key={record.id} className="group hover:bg-primary/5 transition-all">
                              <TableCell className="font-medium py-5">{parseTimestamp(record.timestamp) ? format(parseTimestamp(record.timestamp)!, 'PPP') : 'Invalid date'}</TableCell>
                              <TableCell className="font-black text-lg py-5">{parseTimestamp(record.timestamp) ? format(parseTimestamp(record.timestamp)!, 'p') : 'Invalid time'}</TableCell>
                              <TableCell className="py-5">
                                <Badge variant={record.type === 'entry' ? 'default' : 'secondary'} className="capitalize font-black px-4 py-1.5 h-8 flex items-center gap-2 w-fit rounded-xl">
                                  {record.type === 'entry' ? <LogIn size={18}/> : <LogOut size={18}/>}
                                  {t(record.type)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground font-medium py-5 italic bg-muted/5">{record.observations || "-"}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center h-64 opacity-40 font-black text-xl italic">{t('no_attendance_records_yet')}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="my-qr" className="animate-in fade-in slide-in-from-right-4 duration-500">
           <Card className="glass-card shadow-2xl border-t-8 border-t-accent max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-black tracking-tight">{t('my_qr_code')}</CardTitle>
              <CardDescription className="text-lg font-medium">{t('my_qr_code_description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-10">
              <div id={`qr-code-${loggedInUser.id}`} className="p-10 bg-white rounded-3xl shadow-inner animate-in zoom-in duration-700 ring-8 ring-primary/5">
                 <QRCodeCanvas value={getQrData(loggedInUser.id)} size={280} level="H" />
              </div>
              <div className="mt-10 space-y-2 text-center">
                <p className="text-4xl font-black tracking-tighter text-foreground">{loggedInUser.fullName}</p>
                <Badge variant="outline" className="text-xl px-6 py-2 border-primary/20 bg-primary/5 text-primary font-black uppercase tracking-tighter rounded-full">
                    {t('id')}: {loggedInUser.id}
                </Badge>
              </div>
               <Button onClick={() => handleDownload(loggedInUser.id)} size="lg" className="mt-10 h-16 px-10 text-xl font-black rounded-2xl shadow-xl transition-all">
                  <Download className="mr-3 h-7 w-7" />
                  {t('download_qr_code')}
                </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DashboardPage({ setUnreadReportsCount }: { setUnreadReportsCount?: (count: number) => void }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <DashboardPageContent setUnreadReportsCount={setUnreadReportsCount} />
    </Suspense>
  );
}
