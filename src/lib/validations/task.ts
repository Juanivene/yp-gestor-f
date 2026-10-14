import { z } from "zod";

export const taskFieldsSchema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria").max(2000, "La descripción es demasiado larga"),
  location: z.string().trim().min(1, "El lugar es obligatorio").max(300, "El lugar es demasiado largo"),
  assigneeIds: z
    .array(z.string().uuid("Elegí un trabajador de la lista"))
    .min(1, "Asigná al menos un trabajador")
    .refine((ids) => new Set(ids).size === ids.length, "No podés asignar al mismo trabajador dos veces"),
});

export const createTaskSchema = taskFieldsSchema.extend({
  stationId: z.coerce.number({ error: "Elegí una estación" }).int().positive("Elegí una estación"),
  incidentNumber: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int("Tiene que ser un número entero").positive("Tiene que ser mayor a 0")])
    .transform((v) => (v === "" || v == null ? null : v)),
  estimatedHours: z.coerce
    .number({ error: "Ingresá las horas estimadas" })
    .gt(0, "Las horas tienen que ser mayores a 0")
    .max(999, "Ese tiempo es demasiado largo"),
});

export const updateTaskSchema = taskFieldsSchema;

export const noteSchema = z.object({
  body: z.string().trim().min(1, "Escribí una nota").max(1000, "Máximo 1000 caracteres"),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
