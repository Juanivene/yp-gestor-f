"use client";

import { Building2, Archive, CheckCircle2, ClipboardList, Menu, Star, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { NotificationBell } from "@/components/notification-bell";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: Record<"admin" | "employee", NavItem[]> = {
  admin: [
    { href: "/admin", label: "Tareas", icon: ClipboardList, exact: true },
    { href: "/admin/archivados", label: "Archivados", icon: Archive },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    { href: "/admin/estaciones", label: "Estaciones", icon: Building2 },
  ],
  employee: [
    { href: "/empleado", label: "Inicio", icon: ClipboardList, exact: true },
    { href: "/empleado/importantes", label: "Importantes", icon: Star },
    { href: "/empleado/completadas", label: "Completadas", icon: CheckCircle2 },
    { href: "/empleado/archivadas", label: "Archivadas", icon: Archive },
  ],
};

const ROLE_LABEL = { admin: "Administrador", employee: "Empleado" } as const;

type ShellUser = { firstName: string; lastName: string; role: "admin" | "employee" };

function SidebarContent({ user, onNavigate }: { user: ShellUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 px-4 pt-5 pb-4">
        <BrandLogo className="w-full" />
        <p className="text-center text-xs font-medium text-muted-foreground">Mantenimiento de Estaciones</p>
      </div>

      <div className="mx-3 rounded-lg border bg-card px-3 py-2.5">
        <p className="truncate text-sm font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Secciones">
        {NAV[user.role].map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t p-3">
        <ChangePasswordDialog />
        <LogoutButton />
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background lg:block">
        <SidebarContent user={user} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menú" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle className="sr-only">Menú</SheetTitle>
            <SheetDescription className="sr-only">Navegación principal</SheetDescription>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1 text-right lg:hidden">
          <p className="truncate text-sm font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
        </div>
        <div className="shrink-0 lg:ml-auto">
          <NotificationBell role={user.role} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
