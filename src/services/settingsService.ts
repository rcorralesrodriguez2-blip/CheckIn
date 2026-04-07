
"use client";

import { AppSettings, AppMode } from "@/types";

const apiBase = "/api/settings";

const handleJson = async (response: Response) => {
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `HTTP ${response.status}`);
  }
  return response.json();
};

export const getAppSettings = async (): Promise<AppSettings> => {
  const response = await fetch(apiBase);
  return handleJson(response);
};

export const updateAppMode = async (mode: AppMode): Promise<void> => {
  await fetch(apiBase, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appMode: mode }),
  });
};

export const onSettingsUpdate = async (callback: (settings: AppSettings) => void) => {
  const settings = await getAppSettings();
  callback(settings);
  return () => {};
};
