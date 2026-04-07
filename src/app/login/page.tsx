"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as React from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/common/Logo";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

const formSchema = z.object({
  id: z.string().min(1, { message: "ID is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { login } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const success = await login(values.id, values.password);

    if (success) {
      toast({
        title: t('login_successful'),
        description: `${t('welcome')}!`,
      });
      router.push("/admin");
    } else {
      toast({
        variant: "destructive",
        title: t('login_failed'),
        description: t('invalid_id_or_password'),
      });
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden">
      <div className="absolute top-4 right-4 z-10 animate-in fade-in duration-700">
        <LanguageSwitcher />
      </div>
      
      {/* Background Decorative Circles */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-3xl animate-in zoom-in duration-1000" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-accent/10 rounded-full blur-3xl animate-in zoom-in duration-1000 delay-300" />

      <div className="z-10 w-full max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-8 flex justify-center scale-110 transition-transform hover:scale-125 duration-500">
          <Logo />
        </div>
        <Card className="w-full glass-card hover-lift">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-center">{t('login_title')}</CardTitle>
            <CardDescription className="text-center">
              {t('login_description_password')}
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="grid gap-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('id_label')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('id_placeholder')}
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('password_label')}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t('password_placeholder')}
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]" type="submit">
                  {t('sign_in_button')}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  {t('need_account')}{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {t('register_here')}
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}