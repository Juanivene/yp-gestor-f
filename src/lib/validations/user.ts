import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(5, "El usuario debe tener al menos 5 caracteres")
    .max(40, "El usuario es demasiado largo")
    .regex(/^\S+$/, "El usuario no puede tener espacios"),
  password: z
    .string()
    .min(5, "La contraseña debe tener al menos 5 caracteres")
    .max(100, "La contraseña es demasiado larga"),
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(60, "El nombre es demasiado largo"),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(60, "El apellido es demasiado largo"),
  position: z.string().trim().max(60, "El cargo es demasiado largo").optional().or(z.literal("")),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
