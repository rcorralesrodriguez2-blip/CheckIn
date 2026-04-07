
"use client";

import { useState } from "react";
import { NewUser } from "@/types";
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
import { createUser, getUserById } from "@/services/userService";
import { Loader2, UserPlus } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface CreateUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ isOpen, onOpenChange }: CreateUserDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    id: "",
    password: "",
    role: "user" as "user" | "admin" | "supervisor",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.id || !formData.password) {
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: "Por favor complete todos los campos.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Verificar si ya existe
      const existing = await getUserById(formData.id);
      if (existing) {
        toast({
          variant: "destructive",
          title: t('error_title'),
          description: t('user_exists_error'),
        });
        setIsLoading(false);
        return;
      }

      const newUser: NewUser = {
        id: formData.id,
        fullName: formData.fullName,
        password: formData.password,
        role: formData.role,
        exitLockUntil: null,
      };

      await createUser(newUser);
      
      toast({
        title: t('registration_successful'),
        description: "El usuario ha sido creado correctamente.",
      });
      
      // Reset form and close
      setFormData({
        fullName: "",
        id: "",
        password: "",
        role: "user",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: "Ocurrió un error inesperado.",
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
            <UserPlus className="text-primary" />
            {t('create_user_title')}
          </DialogTitle>
          <DialogDescription className="font-medium">
            {t('create_user_description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="font-bold">{t('full_name_label')}</Label>
            <Input
              id="fullName"
              placeholder={t('full_name_placeholder')}
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="bg-background/50 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="id" className="font-bold">{t('id_card_label')}</Label>
            <Input
              id="id"
              placeholder={t('id_card_placeholder')}
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              className="bg-background/50 h-11 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-bold">{t('password_label')}</Label>
            <Input
              id="password"
              type="text"
              placeholder="Ej. Pass123"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-background/50 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role" className="font-bold">{t('role_label')}</Label>
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
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2 h-5 w-5" />}
              {t('create_button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
