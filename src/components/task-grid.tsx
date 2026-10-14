"use client";

import { PartyPopper } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TaskCard } from "@/components/task-card";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { messages } from "@/lib/messages";
import type { EmployeeOption, TaskCardData } from "@/lib/queries";

export function TaskGrid({
  tasks,
  role,
  showActions = false,
  employees = [],
}: {
  tasks: TaskCardData[];
  role: "admin" | "employee";
  showActions?: boolean;
  employees?: EmployeeOption[];
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  function handleFinished(onTime: boolean) {
    if (onTime) setCelebrate(true);
    else toast.success(messages.tasks.finishedLate);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            showActions={showActions}
            showAssignees={role === "admin"}
            onOpen={setOpenId}
            onFinished={handleFinished}
          />
        ))}
      </div>

      <TaskDetailDialog taskId={openId} role={role} employees={employees} onClose={() => setOpenId(null)} />

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
