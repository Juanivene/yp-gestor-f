import Image from "next/image";
import { cn } from "@/lib/utils";

// El logo es azul sobre fondo claro, así que va dentro de una placa blanca para que se vea bien en el tema oscuro.
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-lg bg-white", className)}>
      <Image
        src="/brand/logo-jar.jpeg"
        alt="JAR Construcciones y Servicios"
        width={928}
        height={437}
        priority={priority}
        className="h-auto w-full"
      />
    </div>
  );
}
