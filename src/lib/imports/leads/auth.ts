import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authenticateImport(authorization: string | null, configuredKey = process.env.IMPORT_API_KEY) {
  if (!configuredKey || configuredKey.length < 24 || !authorization?.startsWith("Bearer ")) return false;
  const suppliedKey = authorization.slice(7);
  if (!suppliedKey) return false;
  return timingSafeEqual(digest(suppliedKey), digest(configuredKey));
}
