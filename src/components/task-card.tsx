"use client";

import { Clock, Loader2, MapPin, Play, Square, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { startTaskAction } from "@/actions/tasks";
import { FinishTaskDialog } from "@/components/finish-task-dialog";
import { ImportantBadge, MissingEvidenceBadge, OnTimeBadge, StatusBadge } from "@/components/task-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
      className={cn(
        "cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
        task.isImportant
          ? "border-red-500/60 bg-red-500/5 ring-1 ring-red-500/30 hover:border-red-500"
          : "hover:border-primary/50",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {task.isImportant && <ImportantBadge />}
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
        <div className="flex flex-wrap items-center gap-2">
          <Clock className="size-4 shrink-0" />
          {task.status === "completed" ? (
            <>
              <OnTimeBadge onTime={task.onTime} />
              {task.requiresEvidence && !task.hasEvidence && <MissingEvidenceBadge />}
            </>
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
          <FinishTaskDialog
            taskId={task.id}
            requiresEvidence={task.requiresEvidence}
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            onFinished={onFinished}
          />
        </>
      )}
    </Card>
  );
}
