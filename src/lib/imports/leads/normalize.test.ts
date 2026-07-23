import { describe, expect, it } from "vitest";
import { buildDedupeKey, normalizeDomain, normalizePhone, normalizeUrl } from "./normalize";
import { leadImportSchema } from "./schema";

describe("lead import normalization", () => {
  it("creates the same key for the same external source identity", () => {
    const first = buildDedupeKey(leadImportSchema.parse({ source: { name: "Webtrh", type: "marketplace", externalId: " 42 " }, lead: { title: "First title" } }));
    const second = buildDedupeKey(leadImportSchema.parse({ source: { name: "webtrh", type: "marketplace", externalId: "42" }, lead: { title: "Changed title" } }));
    expect(first).toBe(second);
  });

  it("uses a stable normalized URL fallback", () => {
    const first = buildDedupeKey(leadImportSchema.parse({ source: { name: "Portal", type: "marketplace", url: "https://EXAMPLE.com/item/?utm_source=x" }, lead: { title: " New   Website " } }));
    const second = buildDedupeKey(leadImportSchema.parse({ source: { name: "portal", type: "marketplace", url: "https://example.com/item" }, lead: { title: "new website" } }));
    expect(first).toBe(second);
  });

  it("normalizes matching identifiers", () => {
    expect(normalizeDomain("https://www.Firma.sk/path")).toBe("firma.sk");
    expect(normalizePhone("+421 900 000 000")).toBe("+421900000000");
    expect(normalizeUrl("https://EXAMPLE.com/item/?utm_medium=email")).toBe("https://example.com/item");
  });
});
