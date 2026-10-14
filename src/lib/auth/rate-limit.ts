const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export function isRateLimited(key: string): boolean {
  return recent(key, Date.now()).length >= MAX_ATTEMPTS;
}

export function registerFailure(key: string): void {
  const now = Date.now();
  const list = recent(key, now);
  list.push(now);
  failures.set(key, list);
  if (failures.size > 5000) {
    for (const k of failures.keys()) recent(k, now);
  }
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
