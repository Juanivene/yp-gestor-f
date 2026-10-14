"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createUserAction } from "@/actions/users";
import { CredentialsDialog, type Credentials } from "@/components/credentials-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { messages } from "@/lib/messages";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user";

const EMPTY: CreateUserInput = { username: "", password: "", firstName: "", lastName: "", position: "" };

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema), defaultValues: EMPTY });

  async function onSubmit(values: CreateUserInput) {
    setSubmitting(true);
    try {
      const res = await createUserAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            setError(field as keyof CreateUserInput, { message });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(messages.users.created);
      reset(EMPTY);
      setOpen(false);
      setCredentials(res.data);
    } catch {
      toast.error(messages.generic.saveError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus />
            Crear empleado
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo empleado</DialogTitle>
            <DialogDescription>Cargá sus datos y la contraseña con la que va a ingresar.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" autoComplete="off" aria-invalid={Boolean(errors.firstName)} {...register("firstName")} />
                {errors.firstName && <p className="text-sm text-red-400">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" autoComplete="off" aria-invalid={Boolean(errors.lastName)} {...register("lastName")} />
                {errors.lastName && <p className="text-sm text-red-400">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-username">Usuario</Label>
              <Input
                id="new-username"
                autoComplete="off"
                autoCapitalize="none"
                aria-invalid={Boolean(errors.username)}
                {...register("username")}
              />
              {errors.username && <p className="text-sm text-red-400">{errors.username.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña</Label>
              <Input
                id="new-password"
                type="text"
                autoComplete="off"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Cargo (opcional)</Label>
              <Input id="position" placeholder="Operario" autoComplete="off" {...register("position")} />
              {errors.position && <p className="text-sm text-red-400">{errors.position.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {submitting ? "Creando…" : "Crear empleado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CredentialsDialog credentials={credentials} title="Empleado creado" onClose={() => setCredentials(null)} />
    </>
  );
}
