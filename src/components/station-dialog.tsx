"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createStationAction, renameStationAction } from "@/actions/stations";
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
import { messages } from "@/lib/messages";
import { stationSchema, type StationInput } from "@/lib/validations/station";

// Sin `station` crea una estación nueva (con su botón); con `station` edita el nombre (controlado desde afuera).
export function StationDialog({
  station,
  open: controlledOpen,
  onOpenChange,
}: {
  station?: { id: number; name: string };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StationInput>({
    resolver: zodResolver(stationSchema),
    defaultValues: { name: station?.name ?? "" },
  });

  async function onSubmit(values: StationInput) {
    setSubmitting(true);
    try {
      const res = station ? await renameStationAction(station.id, values) : await createStationAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            setError(field as keyof StationInput, { message });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(station ? messages.stations.updated : messages.stations.created);
      if (!station) reset({ name: "" });
      setOpen(false);
    } catch {
      toast.error(messages.generic.saveError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) reset({ name: station?.name ?? "" });
        setOpen(o);
      }}
    >
      {!station && (
        <DialogTrigger asChild>
          <Button>
            <Plus />
            Nueva estación
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{station ? "Editar estación" : "Nueva estación"}</DialogTitle>
          <DialogDescription>
            {station ? "Cambiá el nombre. Las tareas existentes lo van a mostrar actualizado." : "Va a aparecer en el selector de “Nueva tarea”."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="station-name">Nombre</Label>
            <Input id="station-name" autoComplete="off" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
