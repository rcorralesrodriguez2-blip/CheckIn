
"use client";

import { AttendanceRecord, NewAttendanceRecord } from "@/types";

const apiBase = "/api/attendance";

const handleJson = async (response: Response) => {
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `HTTP ${response.status}`);
  }
  return response.json();
};

export const createAttendanceRecord = async (record: NewAttendanceRecord): Promise<void> => {
  await fetch(apiBase, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
};

export const updateAttendanceRecord = async (recordId: string, updates: Partial<AttendanceRecord>): Promise<void> => {
  await fetch(`${apiBase}/${encodeURIComponent(recordId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
};

export const getAttendanceRecords = async (callback: (records: (AttendanceRecord & { userName: string, userPhoto?: string })[]) => void) => {
  const response = await fetch(apiBase);
  const records = await handleJson(response);
  callback(records);
  return () => {};
};

export const getUserAttendanceRecords = async (userId: string): Promise<AttendanceRecord[]> => {
  if (!userId) return [];
  const response = await fetch(`${apiBase}?userId=${encodeURIComponent(userId)}`);
  return handleJson(response);
};

export const onUserAttendanceRecordsUpdate = async (userId: string, callback: (records: AttendanceRecord[]) => void) => {
  const records = await getUserAttendanceRecords(userId);
  callback(records);
  return () => {};
};

export const getTodaysAttendanceCount = async (userId: string): Promise<number> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const response = await fetch(
    `${apiBase}?userId=${encodeURIComponent(userId)}&startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`
  );
  const records = await handleJson(response);
  return Array.isArray(records) ? records.length : 0;
};
