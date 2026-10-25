import { z } from "zod";

const newPassword = z
  .string()
  .min(5, "La contraseña debe tener al menos 5 caracteres")
  .max(100, "La contraseña es demasiado larga");

export const setPasswordSchema = z.object({ password: newPassword });
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual").max(100),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });
export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;

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
