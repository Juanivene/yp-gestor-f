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

export function OnTimeBadge({ onTime }: { onTime: boolean | null }) {
  return onTime ? <Badge variant="success">En tiempo</Badge> : <Badge variant="danger">Fuera de tiempo</Badge>;
}
