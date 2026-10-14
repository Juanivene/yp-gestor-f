"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messages } from "@/lib/messages";

export function IncidentSearch({ current, resultCount }: { current: number | null; resultCount: number }) {
  const router = useRouter();
  const [value, setValue] = useState(current?.toString() ?? "");

  useEffect(() => {
    if (current !== null && resultCount === 0) toast.info(messages.tasks.noResults(current), { id: "incident-empty" });
  }, [current, resultCount]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number.parseInt(value, 10);
    if (!Number.isInteger(n) || n <= 0) {
      toast.error("Ingresá un número de incidencia válido.");
      return;
    }
    router.push(`/admin?incidencia=${n}`);
  }

  function clear() {
    setValue("");
    router.push("/admin");
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-wrap items-center gap-2" role="search">
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nº de incidencia"
        aria-label="Número de incidencia"
        className="w-full min-w-0 sm:w-48"
      />
      <Button type="submit" variant="secondary">
        <Search />
        Buscar
      </Button>
      {(current !== null || value) && (
        <Button type="button" variant="ghost" onClick={clear}>
          Limpiar filtros
        </Button>
      )}
    </form>
  );
}
