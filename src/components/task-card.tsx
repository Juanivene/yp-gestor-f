"use client";

import { Clock, Loader2, MapPin, Play, Square, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { finishTaskAction, startTaskAction } from "@/actions/tasks";
import { OnTimeBadge, StatusBadge } from "@/components/task-status";
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
import { formatHours } from "@/lib/format";
import { messages } from "@/lib/messages";
import type { TaskCardData } from "@/lib/queries";

export function TaskCard({
  task,
  showActions,
  showAssignees,
  onOpen,
  onFinished,
}: {
  task: TaskCardData;
  showActions: boolean;
  showAssignees: boolean;
  onOpen: (id: number) => void;
  onFinished: (onTime: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await startTaskAction(task.id);
      if (res.ok) toast.success(messages.tasks.started);
      else toast.error(res.error);
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      const res = await finishTaskAction(task.id);
      setConfirmOpen(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onFinished(res.data.onTime);
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      className="cursor-pointer transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{task.stationName}</Badge>
        {task.incidentNumber !== null && <Badge variant="important">Incidencia #{task.incidentNumber}</Badge>}
        <div className="ml-auto">
          <StatusBadge status={task.status} />
        </div>
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed font-medium">{task.description}</p>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span className="line-clamp-2">{task.location}</span>
        </p>
        {showAssignees && (
          <p className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 shrink-0" />
            <span className="line-clamp-2">
              {task.assignees.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
            </span>
          </p>
        )}
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0" />
          {task.status === "completed" ? (
            <OnTimeBadge onTime={task.onTime} />
          ) : (
            <span>Estimado: {formatHours(task.estimatedHours)}</span>
          )}
        </div>
      </div>

      {showActions && task.status === "pending" && (
        <Button
          className="mt-1 w-full"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void start();
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Play />}
          Empezar tarea
        </Button>
      )}

      {showActions && task.status === "in_progress" && (
        <>
          <Button
            variant="success"
            className="mt-1 w-full"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
          >
            <Square />
            Finalizar trabajo
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>{messages.tasks.confirmFinish}</AlertDialogTitle>
                <AlertDialogDescription>
                  Vamos a registrar la hora de fin ahora mismo. Esto no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Todavía no</AlertDialogCancel>
                <Button variant="success" onClick={finish} disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  Sí, terminé
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </Card>
  );
}
