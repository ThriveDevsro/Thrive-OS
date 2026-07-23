import { createHash } from "node:crypto";
import type { LeadImportInput } from "./schema";

function compact(value: string) {
  return value.trim().toLowerCase().normalize("NFKC").replace(/\s+/g, " ");
}

export function normalizeDomain(value?: string) {
  if (!value) return undefined;
  const candidate = value.trim().toLowerCase().replace(/\.$/, "");
  try {
    return new URL(candidate.includes("://") ? candidate : `https://${candidate}`).hostname.replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
}

export function normalizeUrl(value?: string) {
  if (!value) return undefined;
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  [...url.searchParams.keys()].filter((key) => key.toLowerCase().startsWith("utm_")).forEach((key) => url.searchParams.delete(key));
  url.searchParams.sort();
  return url.toString();
}

export function normalizePhone(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return undefined;
  return `${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

export function normalizeRegistrationNumber(value?: string) {
  return value?.replace(/\s+/g, "").toUpperCase() || undefined;
}

export function buildDedupeKey(input: LeadImportInput) {
  const source = compact(input.source.name);
  const identity = input.source.externalId
    ? `external:${compact(input.source.externalId)}`
    : `fingerprint:${normalizeUrl(input.source.url) ?? ""}:${compact(input.lead.title)}`;
  return createHash("sha256").update(`${source}:${identity}`, "utf8").digest("hex");
}

export function moneyToMinor(value?: number) {
  return value === undefined ? undefined : BigInt(Math.round(value * 100));
}
