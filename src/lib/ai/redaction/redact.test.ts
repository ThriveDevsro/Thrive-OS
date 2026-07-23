import { describe, expect, it } from "vitest";
import { redactSensitiveText } from "./redact";

describe("AI input redaction", () => {
  it("removes common personal and secret values", () => {
    const value = redactSensitiveText(
      "john@example.com +421 905 123 456 password=hunter2 " +
        "Bearer very-secret-token api_key=abcd1234",
    );
    expect(value).not.toContain("john@example.com");
    expect(value).not.toContain("905 123 456");
    expect(value).not.toContain("hunter2");
    expect(value).not.toContain("very-secret-token");
    expect(value).not.toContain("abcd1234");
    expect(value).toContain("[REDACTED_EMAIL]");
  });

  it("redacts secrets embedded in URLs", () => {
    const value = redactSensitiveText(
      "https://example.test/path?token=secret-value&region=sk",
    );
    expect(value).toContain("token=[REDACTED_TOKEN]");
    expect(value).not.toContain("secret-value");
  });
});
