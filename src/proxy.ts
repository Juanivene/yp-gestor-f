import { NextResponse, type NextRequest } from "next/server";

// Chequeo rápido: solo verifica que exista la cookie. La validación real
// (sesión vigente, rol, usuario activo) la hace getCurrentUser() en el servidor.
export function proxy(request: NextRequest) {
  if (!request.cookies.get("session")?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/empleado/:path*"],
};
