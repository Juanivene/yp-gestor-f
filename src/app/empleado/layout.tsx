import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("employee");
  return <AppShell user={user}>{children}</AppShell>;
}
