"use client";

import { Eye, EyeOff, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteStationAction, setStationActiveAction } from "@/actions/stations";
import { StationDialog } from "@/components/station-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { messages } from "@/lib/messages";
import type { StationRow } from "@/lib/queries";

export function StationCard({ station }: { station: StationRow }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"deactivate" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle(isActive: boolean) {
    setBusy(true);
    try {
      const res = await setStationActiveAction(station.id, isActive);
      if (!res.ok) return void toast.error(res.error);
      setConfirm(null);
      toast.success(isActive ? messages.stations.reactivated(res.data.name) : messages.stations.deactivated(res.data.name));
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await deleteStationAction(station.id);
      if (!res.ok) return void toast.error(res.error);
      setConfirm(null);
      toast.success(messages.stations.deleted(res.data.name));
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className={station.isActive ? "gap-1.5" : "gap-1.5 opacity-70"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="truncate font-semibold">{station.name}</p>
            <p className="text-sm text-muted-foreground">
              {station.taskCount === 1 ? "1 tarea" : `${station.taskCount} tareas`}
            </p>
          </div>
          <div className="-mt-1 -mr-2 flex items-center gap-1">
            {!station.isActive && <Badge variant="danger">Inactiva</Badge>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Acciones para ${station.name}`}>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil />
                  Editar nombre
                </DropdownMenuItem>
                {station.isActive ? (
                  <DropdownMenuItem onSelect={() => setConfirm("deactivate")}>
                    <EyeOff />
                    Desactivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => void toggle(true)}>
                    <Eye />
                    Reactivar
                  </DropdownMenuItem>
                )}
                {station.taskCount === 0 && (
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
                    <Trash2 />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <StationDialog station={station} open={editing} onOpenChange={setEditing} />

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? `¿Eliminar ${station.name}?` : `¿Desactivar ${station.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? "Se elimina para siempre. Solo es posible porque no tiene tareas."
                : "Deja de aparecer en “Nueva tarea”. Sus tareas anteriores se conservan y podés reactivarla cuando quieras."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button
              variant={confirm === "delete" ? "destructive" : "default"}
              onClick={() => (confirm === "delete" ? void remove() : void toggle(false))}
              disabled={busy}
            >
              {busy && <Loader2 className="animate-spin" />}
              {confirm === "delete" ? "Eliminar" : "Desactivar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
