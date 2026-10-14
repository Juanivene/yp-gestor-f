"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messages } from "@/lib/messages";

export function UserSearch({ current, resultCount }: { current: string; resultCount: number }) {
  const router = useRouter();
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (current && resultCount === 0) toast.info(messages.users.noResults, { id: "users-empty" });
  }, [current, resultCount]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/admin/usuarios?q=${encodeURIComponent(q)}` : "/admin/usuarios");
  }

  function clear() {
    setValue("");
    router.push("/admin/usuarios");
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-wrap items-center gap-2" role="search">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por nombre y apellido"
        aria-label="Buscar empleado"
        className="w-full min-w-0 sm:w-72"
      />
      <Button type="submit" variant="secondary">
        <Search />
        Buscar
      </Button>
      {(current || value) && (
        <Button type="button" variant="ghost" onClick={clear}>
          Limpiar búsqueda
        </Button>
      )}
    </form>
  );
}
