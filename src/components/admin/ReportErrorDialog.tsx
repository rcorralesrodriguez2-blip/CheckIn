
"use client";

import { useState } from "react";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createReport } from "@/services/reportService";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface ReportErrorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function ReportErrorDialog({ isOpen, onOpenChange, user }: ReportErrorDialogProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!user || !message) return;
    setIsSubmitting(true);
    try {
      await createReport(user.id, user.fullName, message);
      toast({
        title: t('report_sent_title'),
        description: t('report_sent_description'),
      });
      setMessage("");
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: t('report_sent_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('report_issue_title')}</DialogTitle>
          <DialogDescription>
            {t('report_issue_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message">{t('message_label')}</Label>
            <Textarea
              id="message"
              placeholder={t('describe_issue_placeholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t('cancel')}
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={!message || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('send_message_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    