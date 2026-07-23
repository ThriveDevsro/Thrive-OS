export type CollectionMethod = "PUBLIC_HTML" | "RSS" | "API" | "MANUAL" | "CSV" | "EMAIL";
export type SourceDescriptor = { key: string; name: string; baseUrl?: string; method: CollectionMethod; defaultCadenceMinutes?: number; requiresReview: boolean; legalNotes: string; };
export type RawSourceItem = { externalId: string; sourceUrl: string; publishedAt?: Date; payload: Record<string, unknown>; };
export type NormalizedLead = { title: string; originalText: string; sourceUrl: string; companyName?: string; contactName?: string; businessEmail?: string; phone?: string; country?: string; language?: string; serviceCategory?: string; budgetMinor?: bigint; budgetCurrency?: string; };
export interface LeadSourceAdapter { describe(): SourceDescriptor; collect(cursor?: string): Promise<{ items: RawSourceItem[]; nextCursor?: string }>; normalize(item: RawSourceItem): Promise<NormalizedLead>; }
