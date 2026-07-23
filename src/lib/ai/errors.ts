export const aiErrorCodes = [
  "AI_DISABLED",
  "AI_CONFIG_INVALID",
  "AI_RATE_LIMITED",
  "AI_PROVIDER_TIMEOUT",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_PROVIDER_REJECTED",
  "AI_INVALID_OUTPUT",
  "AI_INPUT_TOO_LARGE",
  "AI_PERMISSION_DENIED",
  "AI_DUPLICATE_JOB",
  "AI_LEAD_NOT_FOUND",
] as const;

export type AiErrorCode = (typeof aiErrorCodes)[number];

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    public readonly httpStatus: number,
  ) {
    super(code);
    this.name = "AiError";
  }
}

export function asAiError(error: unknown) {
  return error instanceof AiError
    ? error
    : new AiError("AI_PROVIDER_UNAVAILABLE", 503);
}
