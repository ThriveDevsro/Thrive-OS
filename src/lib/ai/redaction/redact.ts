const privateKeyPattern =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi;
const jwtPattern =
  /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{8,}\b/g;
const bearerPattern = /\bBearer\s+[a-zA-Z0-9._~+/-]+=*/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern =
  /(?<!\w)(?:\+\d{1,3}[\s().-]*)?(?:\d[\s().-]*){7,15}(?!\w)/g;
const secretAssignmentPattern =
  /\b(api[_-]?key|password|passwd|secret|token|cookie|authorization)\s*[:=]\s*["']?[^\s,;"']{4,}["']?/gi;

export function redactSensitiveText(value: string) {
  return value
    .replace(privateKeyPattern, "[REDACTED_SECRET]")
    .replace(jwtPattern, "[REDACTED_TOKEN]")
    .replace(bearerPattern, "[REDACTED_TOKEN]")
    .replace(secretAssignmentPattern, (_match, label: string) =>
      /password|passwd|secret/i.test(label)
        ? `${label}=[REDACTED_SECRET]`
        : `${label}=[REDACTED_TOKEN]`,
    )
    .replace(emailPattern, "[REDACTED_EMAIL]")
    .replace(phonePattern, "[REDACTED_PHONE]")
    .replace(
      /([?&](?:access_token|api_key|apikey|key|token|secret|password)=)[^&#\s]+/gi,
      "$1[REDACTED_TOKEN]",
    );
}
