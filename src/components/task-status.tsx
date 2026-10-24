import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/lib/queries";

const LABEL: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
};

const VARIANT = { pending: "pending", in_progress: "progress", completed: "success" } as const;

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}

export function ImportantBadge() {
  return (
    <Badge variant="danger" className="border-red-500/50 bg-red-500/20 text-red-200">
      <AlertTriangle />
      Importante
    </Badge>
  );
}

export function MissingEvidenceBadge() {
  return <Badge variant="pending">No se declaró evidencia</Badge>;
}

export function OnTimeBadge({ onTime }: { onTime: boolean | null }) {
  return onTime ? <Badge variant="success">En tiempo</Badge> : <Badge variant="danger">Fuera de tiempo</Badge>;
}
