"use client";

import { Briefcase, KeyRound, Loader2, MoreVertical, Pencil, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deactivateUserAction, resetPasswordAction } from "@/actions/users";
import { CredentialsDialog, type Credentials } from "@/components/credentials-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SetPasswordDialog } from "@/components/set-password-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { messages } from "@/lib/messages";
import type { UserCardData } from "@/lib/queries";

export function UserCard({ user }: { user: UserCardData }) {
  const [confirm, setConfirm] = useState<"reset" | "deactivate" | null>(null);
  const [busy, setBusy] = useState(false);
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  async function run() {
    setBusy(true);
    try {
      if (confirm === "reset") {
        const res = await resetPasswordAction(user.id);
        if (!res.ok) return void toast.error(res.error);
        toast.success(messages.users.passwordReset);
        setConfirm(null);
        setCredentials(res.data);
      } else if (confirm === "deactivate") {
        const res = await deactivateUserAction(user.id);
        if (!res.ok) return void toast.error(res.error);
        setConfirm(null);
        toast.success(messages.users.deactivated(res.data.name));
      }
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setBusy(false);
    }
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <Card className="gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{fullName}</p>
            <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Acciones para ${fullName}`} className="-mt-1 -mr-2">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setConfirm("reset")}>
                <KeyRound />
                Resetear contraseña
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSetPasswordOpen(true)}>
                <Pencil />
                Cambiar contraseña
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("deactivate")}>
                <UserMinus />
                Dar de baja
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Briefcase className="size-4" />
          {user.position}
        </p>
      </Card>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "reset" ? `¿Resetear la contraseña de ${fullName}?` : `¿Dar de baja a ${fullName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reset"
                ? "Vamos a generar una contraseña nueva y se va a cerrar su sesión. La vas a ver una sola vez."
                : "No va a poder ingresar ni recibir tareas nuevas. Sus tareas anteriores se conservan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button variant={confirm === "deactivate" ? "destructive" : "default"} onClick={run} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {confirm === "reset" ? "Resetear" : "Dar de baja"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SetPasswordDialog
        userId={user.id}
        fullName={fullName}
        open={setPasswordOpen}
        onOpenChange={setSetPasswordOpen}
      />

      <CredentialsDialog credentials={credentials} title="Contraseña nueva" onClose={() => setCredentials(null)} />
    </>
  );
}
