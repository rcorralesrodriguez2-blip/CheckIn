
"use client";

import { User, NewUser } from "@/types";

const apiBase = "/api/users";

const handleJson = async (response: Response) => {
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `HTTP ${response.status}`);
  }
  return response.json();
};

export const createUser = async (user: NewUser | User): Promise<void> => {
  await fetch(apiBase, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
};

export const getUserById = async (id: string): Promise<User | null> => {
  if (!id) return null;
  const response = await fetch(`${apiBase}/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  return handleJson(response);
};

export const onUsersUpdate = (callback: (users: User[]) => void) => {
  getAllUsers().then(callback).catch(() => {});
  return () => {};
};

export const getAllUsers = async (): Promise<User[]> => {
  const response = await fetch(apiBase);
  return handleJson(response);
};

export const deleteUserById = async (userId: string): Promise<void> => {
  await fetch(`${apiBase}/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
};

export const updateUserRole = async (userId: string, role: 'admin' | 'supervisor' | 'user'): Promise<void> => {
  await fetch(`${apiBase}/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
};

export const setUserExitLock = async (userId: string, lockUntil: Date | null): Promise<void> => {
  await fetch(`${apiBase}/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exitLockUntil: lockUntil ? lockUntil.toISOString() : null }),
  });
};
