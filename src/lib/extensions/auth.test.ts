import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import {
  createExtensionToken,
  extensionTokenExpiry,
  hashExtensionToken,
} from "./auth";

describe("Gmail extension authentication", () => {
  it("creates random tokens stored only as hashes", () => {
    const first = createExtensionToken();
    const second = createExtensionToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashExtensionToken(first)).not.toContain(first);
  });

  it("expires extension access after 30 days", () => {
    const now = new Date("2026-07-27T00:00:00.000Z");
    expect(extensionTokenExpiry(now).toISOString()).toBe(
      "2026-08-26T00:00:00.000Z",
    );
  });
});
