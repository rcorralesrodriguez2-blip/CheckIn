
"use client";

import { useState, useEffect } from "react";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createUser } from "@/services/userService";
import { Loader2, UserCog } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function EditUserDialog({ isOpen, onOpenChange, user }: EditUserDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    password: "",
    role: "user" as "user" | "admin" | "supervisor",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        password: user.password || "",
        role: user.role,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.fullName || !formData.password) {
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: "Por favor complete todos los campos requeridos.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser: User = {
        ...user,
        fullName: formData.fullName,
        password: formData.password,
        role: formData.role,
      };

      await createUser(updatedUser); // Reutiliza createUser ya que usa merge: true
      
      toast({
        title: "Usuario Actualizado",
        description: "La información se ha guardado correctamente.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: "Ocurrió un error inesperado al actualizar.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <UserCog className="text-primary" />
            {t('edit_user_title')}
          </DialogTitle>
          <DialogDescription className="font-medium">
            {t('edit_user_description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
           <div className="space-y-2">
            <Label className="font-bold opacity-60">{t('id_card_label')} (No editable)</Label>
            <Input
              value={user?.id || ""}
              disabled
              className="bg-muted h-11 font-mono opacity-50 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-fullName" className="font-bold">{t('full_name_label')}</Label>
            <Input
              id="edit-fullName"
              placeholder={t('full_name_placeholder')}
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="bg-background/50 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password" className="font-bold">{t('password_label')}</Label>
            <Input
              id="edit-password"
              type="text"
              placeholder="Contraseña"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-background/50 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role" className="font-bold">{t('role_label')}</Label>
            <Select
              value={formData.role}
              onValueChange={(val: any) => setFormData({ ...formData, role: val })}
            >
              <SelectTrigger className="h-11 bg-background/50">
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('user')}</SelectItem>
                <SelectItem value="supervisor">{t('supervisor')}</SelectItem>
                <SelectItem value="admin">{t('admin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 font-black uppercase tracking-tight shadow-xl"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : <UserCog className="mr-2 h-5 w-5" />}
              {t('save_changes_button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
