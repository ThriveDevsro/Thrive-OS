import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { AiError } from "@/lib/ai/errors";

export type OAuthProvider = "google" | "microsoft";

export function oauthConfig(provider: OAuthProvider) {
  const appUrl = process.env.APP_URL;
  const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  const clientId =
    provider === "google"
      ? process.env.GOOGLE_OAUTH_CLIENT_ID
      : process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const clientSecret =
    provider === "google"
      ? process.env.GOOGLE_OAUTH_CLIENT_SECRET
      : process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
  if (!appUrl || !clientId || !clientSecret || !encryptionKey) {
    throw new AiError("AI_CONFIG_INVALID", 503);
  }
  const key = Buffer.from(encryptionKey, "base64");
  if (key.length !== 32) throw new AiError("AI_CONFIG_INVALID", 503);
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/integrations/${provider}/callback`;
  return provider === "google"
    ? {
        provider,
        clientId,
        clientSecret,
        key,
        redirectUri,
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
        scopes: [
          "openid",
          "email",
          "https://www.googleapis.com/auth/gmail.readonly",
        ],
      }
    : {
        provider,
        clientId,
        clientSecret,
        key,
        redirectUri,
        authorizationUrl:
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        profileUrl: "https://graph.microsoft.com/v1.0/me",
        scopes: [
          "openid",
          "email",
          "offline_access",
          "User.Read",
          "Mail.Read",
          "Mail.Send",
          "Calendars.ReadWrite",
        ],
      };
}

export function createPkce() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: randomBytes(32).toString("base64url") };
}

export function encryptProviderTokens(
  value: Record<string, unknown>,
  key: Buffer,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptProviderTokens(
  value: {
    version: number;
    algorithm: string;
    iv: string;
    tag: string;
    ciphertext: string;
  },
  key: Buffer,
) {
  if (value.version !== 1 || value.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported encrypted token format");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  ) as Record<string, unknown>;
}
