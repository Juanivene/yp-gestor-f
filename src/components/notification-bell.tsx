"use client";

import { AlertTriangle, Bell, BellOff, CheckCheck, CheckCircle2, ClipboardList, Play, X, type LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  dismissAllNotificationsAction,
  dismissNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateTime } from "@/lib/format";
import type { NotificationData, NotificationsPayload, NotificationType } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

const ICON: Record<NotificationType, LucideIcon> = {
  task_assigned: ClipboardList,
  task_marked_important: AlertTriangle,
  task_started: Play,
  task_finished: CheckCircle2,
};

// Rojo = sin leer e importante · azul = sin leer · gris = leída (la importante conserva su etiqueta).
function tone(n: NotificationData) {
  if (n.isRead) return { box: "border-border bg-muted/20 text-muted-foreground", icon: "text-muted-foreground" };
  if (n.isImportant) return { box: "border-red-500/50 bg-red-500/10", icon: "text-red-400" };
  return { box: "border-sky-500/40 bg-sky-500/10", icon: "text-sky-400" };
}

export function NotificationBell({ role }: { role: "admin" | "employee" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationsPayload>({ items: [], unread: 0 });
  // Evita que una respuesta vieja del polling pise un cambio optimista reciente.
  const mutations = useRef(0);

  const load = useCallback(async () => {
    const seen = mutations.current;
    try {
      const res = await fetch("/api/notificaciones", { cache: "no-store" });
      if (!res.ok || seen !== mutations.current) return;
      setData((await res.json()) as NotificationsPayload);
    } catch {
      // Sin red: se reintenta en el próximo ciclo.
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  function apply(update: (items: NotificationData[]) => NotificationData[]) {
    mutations.current += 1;
    setData((d) => {
      const items = update(d.items);
      return { items, unread: items.filter((i) => !i.isRead).length };
    });
  }

  function openTask(n: NotificationData) {
    if (!n.isRead) {
      apply((items) => items.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
      void markNotificationReadAction(n.id);
    }
    setOpen(false);
    const params = new URLSearchParams(role === "admin" && pathname === "/admin" ? searchParams.toString() : "");
    params.set("tarea", String(n.taskId));
    const base = role === "admin" ? "/admin" : pathname;
    router.push(`${base}?${params.toString()}`);
  }

  const hasImportantUnread = data.items.some((i) => !i.isRead && i.isImportant);
  const label = data.unread > 0 ? `Notificaciones: ${data.unread} sin leer` : "Notificaciones";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative">
          <Bell className="size-5" />
          {data.unread > 0 && (
            <span
              aria-hidden
              className={cn(
                "absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-none font-semibold text-white",
                hasImportantUnread ? "bg-red-500" : "bg-sky-500",
              )}
            >
              {data.unread > 9 ? "9+" : data.unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-1.5rem)] max-w-sm">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="text-sm font-semibold">Notificaciones</h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs sm:h-8"
              disabled={data.unread === 0}
              onClick={() => {
                apply((items) => items.map((i) => ({ ...i, isRead: true })));
                void markAllNotificationsReadAction();
              }}
            >
              <CheckCheck />
              Marcar leídas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs sm:h-8"
              disabled={data.items.length === 0}
              onClick={() => {
                apply(() => []);
                void dismissAllNotificationsAction();
              }}
            >
              <X />
              Descartar todas
            </Button>
          </div>
        </div>

        {data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
            <BellOff className="size-6" />
            No tenés notificaciones.
          </div>
        ) : (
          <ul className="max-h-[70dvh] space-y-2 overflow-y-auto p-2">
            {data.items.map((n) => {
              const t = tone(n);
              const Icon = n.isImportant ? AlertTriangle : ICON[n.type];
              return (
                <li key={n.id} className={cn("flex items-start gap-1 rounded-lg border", t.box)}>
                  <button
                    type="button"
                    onClick={() => openTask(n)}
                    className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg p-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                  >
                    <Icon className={cn("mt-0.5 size-4 shrink-0", t.icon)} />
                    <span className="min-w-0 flex-1 space-y-1">
                      {n.isImportant && (
                        <span
                          className={cn(
                            "block text-xs font-semibold uppercase",
                            n.isRead ? "text-muted-foreground" : "text-red-300",
                          )}
                        >
                          Importante
                        </span>
                      )}
                      <span className={cn("block text-sm break-words", !n.isRead && "font-medium")}>{n.message}</span>
                      <span className="block text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                    </span>
                    {!n.isRead && (
                      <span
                        aria-label="Sin leer"
                        className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.isImportant ? "bg-red-500" : "bg-sky-500")}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Descartar notificación"
                    onClick={() => {
                      apply((items) => items.filter((i) => i.id !== n.id));
                      void dismissNotificationAction(n.id);
                    }}
                    className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
