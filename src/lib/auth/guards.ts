import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const homeFor = (role: SessionUser["role"]) => (role === "admin" ? "/admin" : "/empleado");

// Para layouts y páginas: redirige si no hay sesión o el rol no corresponde.
export async function requireRole(role: SessionUser["role"]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expirada=1");
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}

// Para Server Actions: la sesión vencida lleva a /login; un rol equivocado es un error.
export async function requireActionRole(
  role: SessionUser["role"],
): Promise<SessionUser | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expirada=1");
  if (user.role !== role) return { ok: false, error: "No tenés permiso para hacer esto." };
  return user;
}

export function isFailure(v: SessionUser | { ok: false; error: string }): v is { ok: false; error: string } {
  return "ok" in v;
}
