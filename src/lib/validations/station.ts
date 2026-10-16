import { z } from "zod";

export const stationSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60, "El nombre es demasiado largo"),
});
export type StationInput = z.infer<typeof stationSchema>;
