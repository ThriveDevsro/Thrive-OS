import { z } from "zod";
import { AiError } from "./errors";

const booleanValue = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const positiveInteger = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

const environmentSchema = z.object({
  AI_ENABLED: booleanValue,
  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().trim().optional(),
  AI_DAILY_LIMIT: positiveInteger(30),
  AI_USER_DAILY_LIMIT: positiveInteger(10),
  AI_MAX_INPUT_CHARS: positiveInteger(6000),
  AI_REQUEST_TIMEOUT_MS: positiveInteger(30000),
  AI_STORE_RAW_INPUT: booleanValue,
  AI_STORE_RAW_OUTPUT: booleanValue,
  AI_VOICE_ENABLED: booleanValue,
  AI_AUDIO_MAX_SIZE_MB: positiveInteger(10),
  AI_AUDIO_MAX_DURATION_SECONDS: positiveInteger(300),
});

export type AiConfig = {
  enabled: boolean;
  provider: "gemini";
  apiKey: string;
  model: string;
  dailyLimit: number;
  userDailyLimit: number;
  maxInputCharacters: number;
  requestTimeoutMs: number;
  voiceEnabled: boolean;
  audioMaxSizeMb: number;
  audioMaxDurationSeconds: number;
  endpoint: URL;
};

export function readAiConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AiConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) throw new AiError("AI_CONFIG_INVALID", 503);
  const value = parsed.data;
  if (!value.AI_ENABLED) throw new AiError("AI_DISABLED", 503);
  if (
    !value.GEMINI_API_KEY ||
    value.GEMINI_API_KEY.length < 16 ||
    !value.AI_MODEL ||
    value.AI_STORE_RAW_INPUT ||
    value.AI_STORE_RAW_OUTPUT
  ) {
    throw new AiError("AI_CONFIG_INVALID", 503);
  }
  const endpoint = new URL("https://generativelanguage.googleapis.com/v1beta/");
  if (endpoint.protocol !== "https:")
    throw new AiError("AI_CONFIG_INVALID", 503);
  return {
    enabled: true,
    provider: value.AI_PROVIDER,
    apiKey: value.GEMINI_API_KEY,
    model: value.AI_MODEL,
    dailyLimit: value.AI_DAILY_LIMIT,
    userDailyLimit: value.AI_USER_DAILY_LIMIT,
    maxInputCharacters: value.AI_MAX_INPUT_CHARS,
    requestTimeoutMs: value.AI_REQUEST_TIMEOUT_MS,
    voiceEnabled: value.AI_VOICE_ENABLED,
    audioMaxSizeMb: value.AI_AUDIO_MAX_SIZE_MB,
    audioMaxDurationSeconds: value.AI_AUDIO_MAX_DURATION_SECONDS,
    endpoint,
  };
}

export function isAiEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return environment.AI_ENABLED === "true";
}
