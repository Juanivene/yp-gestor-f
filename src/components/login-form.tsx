"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { messages } from "@/lib/messages";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm({ expired }: { expired: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });

  useEffect(() => {
    if (expired) toast.info(messages.auth.expired, { id: "session-expired" });
  }, [expired]);

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await loginAction(values);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      toast.success(messages.auth.welcome(res.data.name));
      router.replace(res.data.redirectTo);
      router.refresh();
    } catch {
      setFormError(messages.generic.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="username">Usuario</Label>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            aria-invalid={Boolean(errors.username)}
            {...register("username")}
          />
          {errors.username && <p className="text-sm text-red-400">{errors.username.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
        </div>
        {formError && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {submitting ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
    </Card>
  );
}
