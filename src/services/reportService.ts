
"use client";

import { Message } from "@/types";

const apiBase = "/api/reports";

const handleJson = async (response: Response) => {
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `HTTP ${response.status}`);
  }
  return response.json();
};

export const createReport = async (userId: string, userName: string, message: string) => {
  const body = {
    id: `report-${Date.now()}`,
    userId,
    title: `${userName} report`,
    description: message,
  };
  await fetch(apiBase, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

export const onReportsUpdate = async (callback: (reports: Message[]) => void) => {
  const response = await fetch(apiBase);
  const reports = await handleJson(response);
  callback(reports);
  return () => {};
};

export const updateReportStatus = async (reportId: string, status: 'new' | 'read') => {
  await fetch(`${apiBase}/${encodeURIComponent(reportId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
};
