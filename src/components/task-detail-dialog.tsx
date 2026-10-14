"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { addNoteAction, getTaskDetailAction, updateTaskAction } from "@/actions/tasks";
import { AssigneePicker, type PickerOption } from "@/components/assignee-picker";
import { OnTimeBadge, StatusBadge } from "@/components/task-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatDuration, formatHours } from "@/lib/format";
import { messages } from "@/lib/messages";
import type { EmployeeOption, NoteData, TaskDetailData } from "@/lib/queries";
import { updateTaskSchema } from "@/lib/validations/task";

const NOTE_LIMIT = 1000;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function NotesList({ notes }: { notes: NoteData[] }) {
  if (notes.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay notas.</p>;
  return (
    <ul className="space-y-2">
      {notes.map((n) => (
        <li key={n.id} className="rounded-lg border bg-card px-3 py-2">
          <p className="text-sm whitespace-pre-wrap">{n.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {n.authorName} · {formatDateTime(n.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function NoteComposer({ task, onAdded }: { task: TaskDetailData; onAdded: (note: NoteData) => void }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  if (task.status === "pending") {
    return <p className="text-sm text-muted-foreground">Vas a poder dejar notas cuando empieces la tarea.</p>;
  }

  async function send() {
    setSending(true);
    try {
      const res = await addNoteAction(task.id, { body });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(messages.tasks.noteSent);
      setBody("");
      onAdded(res.data);
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        maxLength={NOTE_LIMIT}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribí una nota sobre el trabajo…"
        aria-label="Nueva nota"
        disabled={sending}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {body.length}/{NOTE_LIMIT}
        </span>
        {body.trim().length > 0 && (
          <Button size="sm" onClick={send} disabled={sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            Enviar nota
          </Button>
        )}
      </div>
    </div>
  );
}

type EditValues = { description: string; location: string; assigneeIds: string[] };

function EditForm({
  task,
  employees,
  onCancel,
  onSaved,
}: {
  task: TaskDetailData;
  employees: EmployeeOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const initialSlots = task.assignees.map((a) => a.id);
  const [slots, setSlots] = useState<string[]>(initialSlots.length ? initialSlots : [""]);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(updateTaskSchema) as unknown as Resolver<EditValues>,
    defaultValues: { description: task.description, location: task.location, assigneeIds: initialSlots },
  });

  // Empleados activos + los ya asignados que están de baja (se pueden quitar, no volver a agregar).
  const options = useMemo<PickerOption[]>(() => {
    const map = new Map<string, PickerOption>();
    for (const e of employees) map.set(e.id, { id: e.id, label: `${e.firstName} ${e.lastName}` });
    for (const a of task.assignees) {
      if (!a.isActive) map.set(a.id, { id: a.id, label: `${a.firstName} ${a.lastName}`, inactive: true });
    }
    return [...map.values()];
  }, [employees, task.assignees]);

  function changeSlots(next: string[]) {
    setSlots(next);
    setValue("assigneeIds", next.filter(Boolean), { shouldValidate: Boolean(errors.assigneeIds) });
  }

  async function onSubmit(values: EditValues) {
    setSaving(true);
    try {
      const res = await updateTaskAction(task.id, values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) setError(field as keyof EditValues, { message });
        }
        toast.error(res.error);
        return;
      }
      toast.success(messages.tasks.updated);
      onSaved();
    } catch {
      toast.error(messages.generic.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="edit-description">Descripción</Label>
        <Textarea id="edit-description" aria-invalid={Boolean(errors.description)} {...register("description")} />
        {errors.description && <p className="text-sm text-red-400">{errors.description.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-location">Dirección o lugar</Label>
        <Input id="edit-location" aria-invalid={Boolean(errors.location)} {...register("location")} />
        {errors.location && <p className="text-sm text-red-400">{errors.location.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Trabajadores</Label>
        <AssigneePicker slots={slots} onChange={changeSlots} options={options} invalid={Boolean(errors.assigneeIds)} />
        {errors.assigneeIds && <p className="text-sm text-red-400">{errors.assigneeIds.message}</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function DetailBody({
  task,
  role,
  employees,
  reload,
  addNote,
}: {
  task: TaskDetailData;
  role: "admin" | "employee";
  employees: EmployeeOption[];
  reload: () => void;
  addNote: (n: NoteData) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditForm
        task={task}
        employees={employees}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{task.stationName}</Badge>
        {task.incidentNumber !== null && <Badge variant="important">Incidencia #{task.incidentNumber}</Badge>}
        <StatusBadge status={task.status} />
        {task.status === "completed" && <OnTimeBadge onTime={task.onTime} />}
      </div>

      <dl className="space-y-4">
        <Field label="Descripción">
          <span className="whitespace-pre-wrap">{task.description}</span>
        </Field>
        <Field label="Lugar">{task.location}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tiempo estimado">{formatHours(task.estimatedHours)}</Field>
          {task.status === "completed" && task.startedAt && task.finishedAt && (
            <Field label="Tiempo trabajado">{formatDuration(task.startedAt, task.finishedAt)}</Field>
          )}
          {task.startedAt && <Field label="Inicio">{formatDateTime(task.startedAt)}</Field>}
          {task.finishedAt && <Field label="Fin">{formatDateTime(task.finishedAt)}</Field>}
        </div>
        <Field label="Trabajadores">
          <ul className="flex flex-wrap gap-1.5">
            {task.assignees.map((a) => (
              <li key={a.id}>
                <Badge variant="outline" className="gap-1.5 py-1 text-sm font-normal">
                  {a.firstName} {a.lastName}
                  {!a.isActive && <span className="text-xs text-red-300">De baja</span>}
                </Badge>
              </li>
            ))}
          </ul>
        </Field>
      </dl>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Notas</h3>
        <NotesList notes={task.notes} />
        {role === "employee" && <NoteComposer task={task} onAdded={addNote} />}
      </section>

      {role === "admin" && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil />
            Editar
          </Button>
        </div>
      )}
    </div>
  );
}

export function TaskDetailDialog({
  taskId,
  role,
  employees,
  onClose,
}: {
  taskId: number | null;
  role: "admin" | "employee";
  employees: EmployeeOption[];
  onClose: () => void;
}) {
  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (taskId === null) return;
    let cancelled = false;
    getTaskDetailAction(taskId)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setTask(res.data);
          setError(null);
        } else {
          setError(res.error);
        }
      })
      .catch(() => {
        if (!cancelled) setError(messages.generic.error);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, version]);

  function handleOpenChange(open: boolean) {
    if (open) return;
    onClose();
    setTask(null);
    setError(null);
  }

  const ready = task !== null && task.id === taskId;

  return (
    <Dialog open={taskId !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle de la tarea</DialogTitle>
          <DialogDescription className="sr-only">Información completa de la tarea</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : ready ? (
          <DetailBody
            task={task}
            role={role}
            employees={employees}
            reload={() => setVersion((v) => v + 1)}
            addNote={(n) => setTask((t) => (t ? { ...t, notes: [...t.notes, n] } : t))}
          />
        ) : (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
