"use client";

import { History, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { listInactiveUsersAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { messages } from "@/lib/messages";
import type { UserCardData } from "@/lib/queries";

export function InactiveUsersDialog() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserCardData[] | null>(null);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setUsers(null);
    try {
      const res = await listInactiveUsersAction();
      if (res.ok) {
        setUsers(res.data);
      } else {
        toast.error(res.error);
        setOpen(false);
      }
    } catch {
      toast.error(messages.generic.error);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <History />
          Historial de bajas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial de bajas</DialogTitle>
          <DialogDescription>Empleados que ya no tienen acceso al sistema.</DialogDescription>
        </DialogHeader>
        {users === null ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <UserX className="size-9" />
            <p className="text-sm">Todavía no hay empleados dados de baja.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="rounded-lg border bg-card px-3 py-2.5">
                <p className="font-medium">
                  {u.firstName} {u.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{u.username} · {u.position}
                </p>
                <p className="text-xs text-muted-foreground">Baja: {formatDate(u.deactivatedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
