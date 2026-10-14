"use client";

import { Copy, KeyRound, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { messages } from "@/lib/messages";

export type Credentials = { username: string; password: string; name: string };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// Muestra el usuario y la contraseña una única vez.
export function CredentialsDialog({
  credentials,
  title,
  onClose,
}: {
  credentials: Credentials | null;
  title: string;
  onClose: () => void;
}) {
  async function copy() {
    if (!credentials) return;
    const ok = await copyText(`Usuario: ${credentials.username}\nContraseña: ${credentials.password}`);
    if (ok) toast.success(messages.users.copied);
    else toast.error("No pudimos copiar. Anotalos a mano.");
  }

  return (
    <Dialog open={credentials !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{credentials?.name}</DialogDescription>
        </DialogHeader>
        {credentials && (
          <div className="space-y-4">
            <dl className="space-y-3 rounded-lg border bg-card p-3">
              <div>
                <dt className="text-xs text-muted-foreground">Usuario</dt>
                <dd className="font-mono text-base break-all">{credentials.username}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Contraseña</dt>
                <dd className="font-mono text-base break-all">{credentials.password}</dd>
              </div>
            </dl>
            <p className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              Guardá esta contraseña: no se va a volver a mostrar.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                Listo
              </Button>
              <Button onClick={copy}>
                <Copy />
                Copiar datos de ingreso
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
