import type { LeadSourceAdapter, NormalizedLead, RawSourceItem, SourceDescriptor } from "./types";

export class WebtrhAdapter implements LeadSourceAdapter {
  describe(): SourceDescriptor { return { key: "webtrh", name: "Webtrh public requests", baseUrl: "https://webtrh.cz/poptavky/", method: "PUBLIC_HTML", defaultCadenceMinutes: 60, requiresReview: true, legalNotes: "Disabled by default. Public pages only; obey robots, terms, rate limits and site-owner instructions. Never bypass Cloudflare, authentication or access controls." }; }
  async collect(): Promise<{ items: RawSourceItem[] }> { throw new Error("Webtrh collection is disabled until source approval is recorded in Settings."); }
  async normalize(item: RawSourceItem): Promise<NormalizedLead> { const title = typeof item.payload.title === "string" ? item.payload.title : "Webtrh request"; const text = typeof item.payload.text === "string" ? item.payload.text : ""; return { title, originalText: text, sourceUrl: item.sourceUrl, language: "cs", country: "CZ", serviceCategory: typeof item.payload.category === "string" ? item.payload.category : undefined }; }
}
