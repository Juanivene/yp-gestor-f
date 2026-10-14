"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { createTaskAction } from "@/actions/tasks";
import { AssigneePicker } from "@/components/assignee-picker";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { messages } from "@/lib/messages";
import type { EmployeeOption } from "@/lib/queries";
import { createTaskSchema } from "@/lib/validations/task";

type FormValues = {
  stationId: string;
  incidentNumber: string;
  description: string;
  location: string;
  estimatedHours: string;
  assigneeIds: string[];
  requiresEvidence: boolean;
};

const EMPTY: FormValues = {
  stationId: "",
  incidentNumber: "",
  description: "",
  location: "",
  estimatedHours: "",
  assigneeIds: [],
  requiresEvidence: false,
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-400">{message}</p> : null;
}

export function CreateTaskDialog({
  stations,
  employees,
}: {
  stations: { id: number; name: string }[];
  employees: EmployeeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slots, setSlots] = useState<string[]>([""]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createTaskSchema) as unknown as Resolver<FormValues>,
    defaultValues: EMPTY,
  });

  const options = useMemo(
    () => employees.map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}` })),
    [employees],
  );

  function changeSlots(next: string[]) {
    setSlots(next);
    setValue("assigneeIds", next.filter(Boolean), { shouldValidate: Boolean(errors.assigneeIds) });
  }

  function resetAll() {
    reset(EMPTY);
    setSlots([""]);
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await createTaskAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            setError(field as keyof FormValues, { message });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(messages.tasks.created);
      resetAll();
      setOpen(false);
    } catch {
      toast.error(messages.generic.saveError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nueva tarea
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>Cargá el trabajo y asignale a quién lo va a hacer.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Estación</Label>
            <Controller
              control={control}
              name="stationId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={Boolean(errors.stationId)} aria-label="Estación">
                    <SelectValue placeholder="Elegí una estación" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.stationId?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incidentNumber">Número de incidencia (opcional)</Label>
              <Input
                id="incidentNumber"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                aria-invalid={Boolean(errors.incidentNumber)}
                {...register("incidentNumber")}
              />
              <FieldError message={errors.incidentNumber?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Tiempo estimado (horas)</Label>
              <Input
                id="estimatedHours"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.25"
                placeholder="Ej: 1.5"
                aria-invalid={Boolean(errors.estimatedHours)}
                {...register("estimatedHours")}
              />
              <FieldError message={errors.estimatedHours?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" aria-invalid={Boolean(errors.description)} {...register("description")} />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Dirección o lugar</Label>
            <Input id="location" aria-invalid={Boolean(errors.location)} {...register("location")} />
            <FieldError message={errors.location?.message} />
          </div>

          <div className="space-y-2">
            <Label>Trabajadores</Label>
            <AssigneePicker slots={slots} onChange={changeSlots} options={options} invalid={Boolean(errors.assigneeIds)} />
            <FieldError message={errors.assigneeIds?.message} />
          </div>

          <label className="flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register("requiresEvidence")} />
            <span>
              <span className="font-medium">Requiere evidencia</span>
              <span className="block text-muted-foreground">
                Al finalizar, el empleado tiene que cargar una foto o confirmar que la termina sin ella.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Creando…" : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
