import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

describe("AI secret and logging boundaries", () => {
  it("does not reference the Gemini secret from the client component", () => {
    const client = readFileSync(
      resolve(root, "src/app/(app)/lead-radar/ai-analysis-panel.tsx"),
      "utf8",
    );
    expect(client).toContain('"use client"');
    expect(client).not.toContain("GEMINI_API_KEY");
    expect(client).not.toContain("x-goog-api-key");
  });

  it("does not log raw prompts or provider responses", () => {
    const provider = readFileSync(
      resolve(root, "src/lib/ai/providers/gemini.ts"),
      "utf8",
    );
    const service = readFileSync(
      resolve(root, "src/lib/ai/lead-analysis/service.ts"),
      "utf8",
    );
    expect(provider).not.toMatch(/\bconsole\./);
    expect(service).not.toMatch(/\bconsole\./);
    expect(service).not.toContain("rawInput");
    expect(service).not.toContain("rawOutput");
  });
});
