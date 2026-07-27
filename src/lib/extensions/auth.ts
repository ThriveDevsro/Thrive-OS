import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export function hashExtensionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createExtensionToken() {
  return randomBytes(32).toString("base64url");
}

export function extensionTokenExpiry(now = new Date()) {
  return new Date(now.getTime() + TOKEN_LIFETIME_MS);
}

export function validChromeRedirect(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !/^[a-p]{32}\.chromiumapp\.org$/.test(url.hostname) ||
      url.pathname !== "/thrive"
    ) {
      return null;
    }
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export async function authenticateExtension(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const supplied = authorization.slice(7);
  if (supplied.length < 32) return null;
  const suppliedHash = hashExtensionToken(supplied);
  const token = await prisma.extensionToken.findUnique({
    where: { tokenHash: suppliedHash },
    include: { user: true },
  });
  if (
    !token ||
    token.revokedAt ||
    token.expiresAt <= new Date() ||
    token.user.status !== "ACTIVE"
  ) {
    return null;
  }
  const stored = Buffer.from(token.tokenHash);
  const candidate = Buffer.from(suppliedHash);
  if (stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) {
    return null;
  }
  await prisma.extensionToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    tokenId: token.id,
    workspaceId: token.workspaceId,
    userId: token.userId,
  };
}
