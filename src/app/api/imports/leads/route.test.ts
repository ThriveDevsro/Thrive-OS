import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetImportRateLimitForTests } from "@/lib/imports/leads/rate-limit";

const { importLeadMock } = vi.hoisted(() => ({ importLeadMock: vi.fn() }));
vi.mock("@/lib/imports/leads/service", () => ({ importLead: importLeadMock }));

import { POST } from "./route";

const apiKey = "test-import-key-at-least-24-characters";
const minimalPayload = {
  source: { name: "webtrh", type: "marketplace", url: "https://example.com/item/12345" },
  lead: { title: "Hľadám dodávateľa webu" },
};

function request(payload: unknown, key = apiKey) {
  return new Request("http://localhost/api/imports/leads", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/imports/leads", () => {
  beforeEach(() => {
    process.env.IMPORT_API_KEY = apiKey;
    resetImportRateLimitForTests();
    importLeadMock.mockReset();
    importLeadMock.mockResolvedValue({ duplicate: false, leadId: "lead-1", importId: "import-1" });
  });

  it("imports a minimal lead", async () => {
    const response = await POST(request(minimalPayload));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ success: true, duplicate: false, leadId: "lead-1", importId: "import-1" });
  });

  it("imports a full lead", async () => {
    const response = await POST(request({
      source: { name: "webtrh", type: "marketplace", externalId: "12345", url: "https://example.com/item/12345" },
      lead: { title: "Web", description: "Nový firemný web", category: "web-development", budgetMin: 1000, budgetMax: 3000, currency: "EUR", publishedAt: "2026-07-23T10:00:00Z" },
      company: { name: "Firma s.r.o.", website: "https://firma.sk", domain: "firma.sk", ico: "12345678" },
      contact: { firstName: "Ján", lastName: "Novák", email: "jan@firma.sk", phone: "+421900000000" },
      metadata: { location: "Bratislava" },
    }));
    expect(response.status).toBe(201);
    expect(importLeadMock).toHaveBeenCalledOnce();
  });

  it("rejects an invalid API key", async () => {
    const response = await POST(request(minimalPayload, "incorrect-key-at-least-24-characters"));
    expect(response.status).toBe(401);
    expect(importLeadMock).not.toHaveBeenCalled();
  });

  it("rejects a missing title", async () => {
    const response = await POST(request({ source: minimalPayload.source, lead: {} }));
    expect(response.status).toBe(400);
  });

  it("returns 200 for a duplicate", async () => {
    importLeadMock.mockResolvedValue({ duplicate: true, leadId: "lead-1", importId: "import-1" });
    const response = await POST(request(minimalPayload));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, duplicate: true });
  });

  it("rejects a payload larger than 256 KB", async () => {
    const response = await POST(request({
      ...minimalPayload,
      metadata: { raw: "x".repeat(257 * 1024) },
    }));
    expect(response.status).toBe(413);
    expect(importLeadMock).not.toHaveBeenCalled();
  });

  it("does not expose database errors", async () => {
    importLeadMock.mockRejectedValue(new Error("password=secret database failure"));
    const response = await POST(request(minimalPayload));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
