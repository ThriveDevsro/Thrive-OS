type Window = { count: number; resetsAt: number };

const windows = new Map<string, Window>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

export function checkImportRateLimit(identifier: string, now = Date.now()) {
  const current = windows.get(identifier);
  if (!current || current.resetsAt <= now) {
    windows.set(identifier, { count: 1, resetsAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= MAX_REQUESTS,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)),
  };
}

export function resetImportRateLimitForTests() {
  windows.clear();
}
