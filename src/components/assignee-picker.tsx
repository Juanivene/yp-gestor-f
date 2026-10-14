"use client";

import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PickerOption = { id: string; label: string; inactive?: boolean };

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Slot({
  value,
  options,
  takenIds,
  invalid,
  canRemove,
  onSelect,
  onRemove,
  index,
}: {
  value: string;
  options: PickerOption[];
  takenIds: Set<string>;
  invalid: boolean;
  canRemove: boolean;
  onSelect: (id: string) => void;
  onRemove: () => void;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            aria-label={`Trabajador ${index + 1}`}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground",
              invalid && "border-destructive",
            )}
          >
            <span className="truncate">
              {selected ? selected.label : "Elegí un trabajador"}
              {selected?.inactive && " (De baja)"}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-64">
          <Command filter={(val, search) => (normalize(val).includes(normalize(search)) ? 1 : 0)}>
            <CommandInput placeholder="Buscar por nombre…" />
            <CommandList>
              <CommandEmpty>No encontramos a nadie con ese nombre.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const taken = takenIds.has(o.id) && o.id !== value;
                  const disabled = taken || (o.inactive === true && o.id !== value);
                  return (
                    <CommandItem
                      key={o.id}
                      value={o.label}
                      disabled={disabled}
                      onSelect={() => {
                        onSelect(o.id);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("size-4", o.id === value ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{o.label}</span>
                      {o.inactive && <span className="ml-auto text-xs text-muted-foreground">De baja</span>}
                      {taken && <span className="ml-auto text-xs text-muted-foreground">Ya elegido</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Quitar trabajador ${index + 1}`}
        disabled={!canRemove}
        onClick={onRemove}
      >
        <X />
      </Button>
    </div>
  );
}

// Lista dinámica de selectores. Un valor "" es un selector todavía sin elegir.
export function AssigneePicker({
  slots,
  onChange,
  options,
  invalid = false,
}: {
  slots: string[];
  onChange: (slots: string[]) => void;
  options: PickerOption[];
  invalid?: boolean;
}) {
  const takenIds = new Set(slots.filter(Boolean));
  const available = options.some((o) => !o.inactive && !takenIds.has(o.id));

  return (
    <div className="space-y-2">
      {slots.map((value, i) => (
        <Slot
          key={i}
          index={i}
          value={value}
          options={options}
          takenIds={takenIds}
          invalid={invalid && !value}
          canRemove={slots.length > 1}
          onSelect={(id) => onChange(slots.map((s, j) => (j === i ? id : s)))}
          onRemove={() => onChange(slots.filter((_, j) => j !== i))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!available}
        onClick={() => onChange([...slots, ""])}
      >
        <Plus />
        Agregar trabajador
      </Button>
    </div>
  );
}
