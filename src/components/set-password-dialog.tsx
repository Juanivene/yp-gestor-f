"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { setUserPasswordAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { messages } from "@/lib/messages";
import { setPasswordSchema, type SetPasswordInput } from "@/lib/validations/user";

type Props = { userId: string; fullName: string; open: boolean; onOpenChange: (open: boolean) => void };

export function SetPasswordDialog({ userId, fullName, open, onOpenChange }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({ resolver: zodResolver(setPasswordSchema), defaultValues: { password: "" } });

  async function onSubmit(values: SetPasswordInput) {
    try {
      const res = await setUserPasswordAction(userId, values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            setError(field as keyof SetPasswordInput, { message });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(messages.users.passwordChanged);
      reset();
      onOpenChange(false);
    } catch {
      toast.error(messages.generic.saveError);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña de {fullName}</DialogTitle>
          <DialogDescription>Se va a cerrar su sesión y va a ingresar con la contraseña nueva.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor={`set-password-${userId}`}>Contraseña nueva</Label>
            <Input
              id={`set-password-${userId}`}
              type="text"
              autoComplete="off"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
