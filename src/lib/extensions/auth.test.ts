import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import {
  createExtensionToken,
  extensionTokenExpiry,
  hashExtensionToken,
  validChromeRedirect,
} from "./auth";

describe("Gmail extension authentication", () => {
  it("creates random tokens stored only as hashes", () => {
    const first = createExtensionToken();
    const second = createExtensionToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashExtensionToken(first)).not.toContain(first);
  });

  it("accepts only Chrome identity callback URLs", () => {
    const id = "abcdefghijklmnopabcdefghijklmnop";
    expect(validChromeRedirect(`https://${id}.chromiumapp.org/thrive`)?.href).toBe(
      `https://${id}.chromiumapp.org/thrive`,
    );
    expect(validChromeRedirect("https://attacker.example/thrive")).toBeNull();
    expect(
      validChromeRedirect(`https://${id}.chromiumapp.org/other`),
    ).toBeNull();
  });

  it("expires extension access after 30 days", () => {
    const now = new Date("2026-07-27T00:00:00.000Z");
    expect(extensionTokenExpiry(now).toISOString()).toBe(
      "2026-08-26T00:00:00.000Z",
    );
  });
});
