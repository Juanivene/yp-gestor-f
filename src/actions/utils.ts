import type { ZodError } from "zod";

export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function isUniqueViolation(err: unknown, constraintHint?: string): boolean {
  const e = err as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  const code = e?.code ?? e?.cause?.code;
  const name = e?.constraint_name ?? e?.cause?.constraint_name ?? "";
  return code === "23505" && (!constraintHint || name.includes(constraintHint));
}
