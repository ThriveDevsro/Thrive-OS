import type { LeadAnalysisOutput } from "./output-schema";

export type PublicLeadAnalysisInput = {
  title: string;
  description?: string;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  sourceName?: string;
  companyName?: string;
  companyDomain?: string;
  metadata?: Record<string, string | number | boolean>;
};

export type AiProviderRequest = {
  systemInstruction: string;
  prompt: string;
};

export type AiJsonRequest = AiProviderRequest & {
  jsonSchema: Record<string, unknown>;
  images?: Array<{ mimeType: string; dataBase64: string }>;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  analyzeLead(request: AiProviderRequest): Promise<LeadAnalysisOutput>;
  generateJson(request: AiJsonRequest): Promise<unknown>;
}
