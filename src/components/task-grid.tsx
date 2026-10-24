"use client";

import { Archive, ArchiveRestore, CheckSquare, Loader2, PartyPopper, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { archiveTasksAction } from "@/actions/tasks";
import { TaskCard } from "@/components/task-card";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { messages } from "@/lib/messages";
import type { EmployeeOption, TaskCardData } from "@/lib/queries";

export function TaskGrid({
  tasks,
  role,
  showActions = false,
  employees = [],
  selectable = false,
}: {
  selectable?: boolean;
  tasks: TaskCardData[];
  role: "admin" | "employee";
  showActions?: boolean;
  employees?: EmployeeOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openId, setOpenId] = useState<number | null>(null);

  // Las notificaciones llevan acá con ?tarea=ID: se abre el detalle y se limpia la URL al cerrarlo.
  const paramId = Number(searchParams.get("tarea")) || null;
  const [seenParam, setSeenParam] = useState<number | null>(null);
  if (paramId !== seenParam) {
    setSeenParam(paramId);
    if (paramId) setOpenId(paramId);
  }

  function closeDetail() {
    setOpenId(null);
    if (!searchParams.has("tarea")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tarea");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }
  const [celebrate, setCelebrate] = useState(false);

  // Al finalizar se pregunta si se archiva; el festejo / toast sale después de la respuesta.
  const [justFinished, setJustFinished] = useState<{ id: number; onTime: boolean } | null>(null);
  const [archiving, setArchiving] = useState(false);

  function handleFinished(id: number, onTime: boolean) {
    setJustFinished({ id, onTime });
  }

  async function answerArchive(archive: boolean) {
    const done = justFinished;
    if (!done) return;
    if (archive) {
      setArchiving(true);
      try {
        const res = await archiveTasksAction([done.id], true);
        if (res.ok) toast.success(messages.tasks.archived(1));
        else toast.error(res.error);
      } catch {
        toast.error(messages.generic.error);
      } finally {
        setArchiving(false);
      }
    }
    setJustFinished(null);
    if (done.onTime) setCelebrate(true);
    else toast.success(messages.tasks.finishedLate);
  }

  // Selección múltiple para archivar / desarchivar.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const pickableIds = tasks.filter((t) => t.status === "completed").map((t) => t.id);
  const inArchive = tasks.length > 0 && tasks.every((t) => t.isArchived);
  const chosen = [...selected].filter((id) => pickableIds.includes(id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function applyBulk() {
    setBulkBusy(true);
    try {
      const res = await archiveTasksAction(chosen, !inArchive);
      if (res.ok) {
        toast.success(inArchive ? messages.tasks.unarchived(res.data.count) : messages.tasks.archived(res.data.count));
        stopSelecting();
      } else toast.error(res.error);
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <>
      {selectable && pickableIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {!selecting ? (
            <Button variant="outline" onClick={() => setSelecting(true)}>
              <CheckSquare />
              Seleccionar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setSelected(chosen.length === pickableIds.length ? new Set() : new Set(pickableIds))}
              >
                {chosen.length === pickableIds.length ? "Quitar selección" : "Seleccionar todas las completadas"}
              </Button>
              <Button disabled={chosen.length === 0 || bulkBusy} onClick={() => void applyBulk()}>
                {bulkBusy ? <Loader2 className="animate-spin" /> : inArchive ? <ArchiveRestore /> : <Archive />}
                {inArchive ? "Desarchivar" : "Archivar"} ({chosen.length})
              </Button>
              <Button variant="ghost" onClick={stopSelecting} disabled={bulkBusy}>
                <X />
                Cancelar
              </Button>
              <span className="text-sm text-muted-foreground">Solo se pueden elegir tareas completadas.</span>
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            showActions={showActions}
            showAssignees={role === "admin"}
            onOpen={setOpenId}
            onFinished={handleFinished}
            selecting={selecting}
            selected={selected.has(task.id)}
            onToggleSelect={toggle}
          />
        ))}
      </div>

      <TaskDetailDialog taskId={openId} role={role} employees={employees} onClose={closeDetail} />

      <AlertDialog open={justFinished !== null} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.tasks.confirmArchive}</AlertDialogTitle>
            <AlertDialogDescription>{messages.tasks.confirmArchiveBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving} onClick={() => void answerArchive(false)}>
              No, dejarla
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={archiving}
              onClick={(e) => {
                e.preventDefault();
                void answerArchive(true);
              }}
            >
              {archiving && <Loader2 className="animate-spin" />}
              Sí, archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={celebrate} onOpenChange={setCelebrate}>
        <DialogContent className="items-center border-emerald-500/40 text-center sm:max-w-sm">
          <DialogHeader className="items-center pr-0">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <PartyPopper className="size-9" />
            </div>
            <DialogTitle className="text-xl text-emerald-300">{messages.tasks.finishedOnTimeTitle}</DialogTitle>
            <DialogDescription className="text-base">{messages.tasks.finishedOnTimeBody}</DialogDescription>
          </DialogHeader>
          <Button variant="success" className="w-full" onClick={() => setCelebrate(false)}>
            ¡Gracias!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
