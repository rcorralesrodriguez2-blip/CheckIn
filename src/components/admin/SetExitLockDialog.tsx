
"use client";

import { useState, useEffect } from "react";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { useLanguage } from "@/i18n/LanguageContext";

interface SetExitLockDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: (userId: string, lockUntil: Date | null) => void;
}

export function SetExitLockDialog({ isOpen, onOpenChange, user, onConfirm }: SetExitLockDialogProps) {
  const { t } = useLanguage();
  const [dateTime, setDateTime] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.exitLockUntil) {
      // Format the date for the datetime-local input
      const date = user.exitLockUntil;
      const localDateTime = format(date, "yyyy-MM-dd'T'HH:mm");
      setDateTime(localDateTime);
    } else {
      setDateTime("");
    }
    setError("");
  }, [user]);

  const handleSubmit = () => {
    if (!user) return;
    if (dateTime) {
      const lockDate = new Date(dateTime);
      if (isNaN(lockDate.getTime())) {
        setError(t('invalid_date_format'));
        return;
      }
      if (lockDate <= new Date()) {
        setError(t('lock_time_in_future'));
        return;
      }
       onConfirm(user.id, lockDate);
    } else {
       onConfirm(user.id, null);
    }
    setError("");
  };

  const handleClearLock = () => {
    if (!user) return;
    setDateTime("");
    onConfirm(user.id, null);
  }

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('set_exit_lock_for', { name: user.fullName })}</DialogTitle>
          <DialogDescription>
            {t('set_exit_lock_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lock-datetime" className="text-right">
              {t('lock_until_label')}
            </Label>
            <Input
              id="lock-datetime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="col-span-3"
            />
          </div>
           {error && <p className="text-sm text-destructive col-span-4 text-center">{error}</p>}
        </div>
        <DialogFooter>
          {user.exitLockUntil && (
             <Button type="button" variant="destructive" onClick={handleClearLock}>
              {t('clear_lock_button')}
            </Button>
          )}
          <Button type="button" onClick={handleSubmit}>{t('set_lock_button')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    