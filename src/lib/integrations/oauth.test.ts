import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createPkce,
  decryptProviderTokens,
  encryptProviderTokens,
  resolveOAuthAppUrl,
} from "./oauth";

describe("integration OAuth security", () => {
  it("always uses the canonical Thrive OS domain in production", () => {
    expect(resolveOAuthAppUrl("http://localhost:3001", "production")).toBe(
      "https://app.thrivedev.co",
    );
    expect(resolveOAuthAppUrl("https://preview.vercel.app", "production")).toBe(
      "https://app.thrivedev.co",
    );
  });

  it("allows a local callback origin during development", () => {
    expect(resolveOAuthAppUrl("http://localhost:3001/", "development")).toBe(
      "http://localhost:3001",
    );
  });

  it("creates unique PKCE verifier, challenge and state values", () => {
    const first = createPkce();
    const second = createPkce();
    expect(first.verifier).not.toBe(second.verifier);
    expect(first.challenge).not.toBe(first.verifier);
    expect(first.state).not.toBe(second.state);
  });

  it("stores provider tokens only as authenticated ciphertext", () => {
    const key = randomBytes(32);
    const tokens = {
      access_token: "secret-access-token",
      refresh_token: "secret-refresh-token",
    };
    const encrypted = encryptProviderTokens(tokens, key);
    expect(JSON.stringify(encrypted)).not.toContain("secret-access-token");
    expect(decryptProviderTokens(encrypted, key)).toEqual(tokens);
    expect(() => decryptProviderTokens(encrypted, randomBytes(32))).toThrow();
  });
});
