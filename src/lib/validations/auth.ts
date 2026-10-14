import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Ingresá tu usuario"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});
export type LoginInput = z.infer<typeof loginSchema>;
