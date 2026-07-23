import type { Prisma } from "@/generated/prisma/client";
import { redactSensitiveText } from "../redaction/redact";
import type { PublicLeadAnalysisInput } from "../types";

const allowedMetadataKeys = new Set([
  "location",
  "region",
  "industry",
  "projectType",
  "deadline",
  "language",
  "technologies",
]);

type LeadForAnalysis = {
  title: string;
  description: string | null;
  serviceCategory: string | null;
  budgetMinor: bigint | null;
  budgetCurrency: string | null;
  company: { name: string; domain: string | null } | null;
  source: { name: string } | null;
  importEvents: Array<{ metadata: Prisma.JsonValue }>;
};

export function buildLeadAnalysisDto(
  lead: LeadForAnalysis,
): PublicLeadAnalysisInput {
  const metadataSource = lead.importEvents[0]?.metadata;
  const metadata: Record<string, string | number | boolean> = {};
  if (
    metadataSource &&
    typeof metadataSource === "object" &&
    !Array.isArray(metadataSource)
  ) {
    for (const [key, value] of Object.entries(metadataSource)) {
      if (
        allowedMetadataKeys.has(key) &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean")
      ) {
        metadata[key] =
          typeof value === "string" ? redactSensitiveText(value) : value;
      }
    }
  }
  const budget =
    lead.budgetMinor === null ? undefined : Number(lead.budgetMinor) / 100;
  return {
    title: redactSensitiveText(lead.title),
    description: lead.description
      ? redactSensitiveText(lead.description)
      : undefined,
    category: lead.serviceCategory ?? undefined,
    budgetMax: budget,
    currency: lead.budgetCurrency ?? undefined,
    sourceName: lead.source?.name,
    companyName: lead.company?.name,
    companyDomain: lead.company?.domain ?? undefined,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}
