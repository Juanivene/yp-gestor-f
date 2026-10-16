import { getCurrentUser } from "@/lib/auth/session";
import { getNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// El panel consulta esto cada ~30 s; cada usuario solo ve las suyas.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  return Response.json(await getNotifications(user.id), { headers: { "Cache-Control": "no-store" } });
}
