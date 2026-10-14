import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Compass className="size-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <p className="text-muted-foreground">Puede que el enlace esté mal o que la página ya no exista.</p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
