"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { logoutAction } from "@/actions/auth";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/messages";

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const res = await logoutAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOpen(false);
      toast.success(messages.auth.loggedOut);
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground">
          <LogOut />
          Cerrar sesión
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{messages.auth.confirmLogout}</AlertDialogTitle>
          <AlertDialogDescription>Vas a tener que volver a ingresar con tu usuario y contraseña.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button onClick={confirm} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Cerrar sesión
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
