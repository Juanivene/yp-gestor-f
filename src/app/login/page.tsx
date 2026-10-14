import { Wrench } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { homeFor } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expirada?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { expirada } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Wrench className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Mantenimiento de Estaciones</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ingresá con tu usuario para continuar.</p>
          </div>
        </div>
        <LoginForm expired={Boolean(expirada)} />
      </div>
    </main>
  );
}
