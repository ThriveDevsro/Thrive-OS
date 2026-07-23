import { describe, expect, it } from "vitest";
import { readAiConfig } from "./config";

const valid = {
  AI_ENABLED: "true",
  AI_PROVIDER: "gemini",
  GEMINI_API_KEY: "test-key-at-least-16-characters",
  AI_MODEL: "gemini-test",
  AI_DAILY_LIMIT: "20",
  AI_USER_DAILY_LIMIT: "5",
  AI_MAX_INPUT_CHARS: "4000",
  AI_REQUEST_TIMEOUT_MS: "1000",
};

describe("AI configuration", () => {
  it("keeps AI disabled without requiring provider secrets", () => {
    expect(() => readAiConfig({ AI_ENABLED: "false" })).toThrow("AI_DISABLED");
  });

  it("requires a server-side key and explicit model when enabled", () => {
    expect(() => readAiConfig({ ...valid, GEMINI_API_KEY: undefined })).toThrow(
      "AI_CONFIG_INVALID",
    );
    expect(() => readAiConfig({ ...valid, AI_MODEL: undefined })).toThrow(
      "AI_CONFIG_INVALID",
    );
  });

  it("refuses raw input or output persistence", () => {
    expect(() =>
      readAiConfig({ ...valid, AI_STORE_RAW_INPUT: "true" }),
    ).toThrow("AI_CONFIG_INVALID");
    expect(() =>
      readAiConfig({ ...valid, AI_STORE_RAW_OUTPUT: "true" }),
    ).toThrow("AI_CONFIG_INVALID");
  });

  it("parses bounded operational settings", () => {
    const config = readAiConfig(valid);
    expect(config).toMatchObject({
      enabled: true,
      model: "gemini-test",
      dailyLimit: 20,
      userDailyLimit: 5,
      maxInputCharacters: 4000,
    });
    expect(config.endpoint.protocol).toBe("https:");
  });
});
