
export type AppMode = 'corporate' | 'school';

export interface AppSettings {
  appMode: AppMode;
}

export interface User {
  id: string; 
  fullName: string;
  role: 'admin' | 'user' | 'supervisor';
  password?: string;
  photo?: string;
  exitLockUntil?: Date | null;
  fingerprintTemplate?: string;
}

export interface NewUser extends Omit<User, 'id' | 'exitLockUntil'> {
  id: string;
  exitLockUntil: null;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  timestamp: Date | string;
  type: 'entry' | 'exit';
  photo?: string;
  observations?: string;
  method?: 'qr' | 'fingerprint';
}

export type NewAttendanceRecord = Omit<AttendanceRecord, 'id' | 'timestamp'> & {
  timestamp: Date;
};

export interface Message {
    id?: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: Date | string;
    status: 'new' | 'read';
}
