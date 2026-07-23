import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAiAccessContext } from "@/lib/ai/access";
import {
  encryptProviderTokens,
  oauthConfig,
  type OAuthProvider,
} from "@/lib/integrations/oauth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await params;
  if (rawProvider !== "google" && rawProvider !== "microsoft") {
    return NextResponse.redirect(
      new URL("/connections?connection=invalid", request.url),
    );
  }
  const provider = rawProvider as OAuthProvider;
  try {
    const access = await getAiAccessContext();
    const config = oauthConfig(provider);
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieStore = await cookies();
    const cookieName = `thrive_oauth_${provider}`;
    const savedRaw = cookieStore.get(cookieName)?.value;
    cookieStore.delete(cookieName);
    if (!code || !state || !savedRaw) throw new Error("invalid_oauth_state");
    const saved = JSON.parse(savedRaw) as {
      state: string;
      verifier: string;
      createdAt: number;
    };
    if (
      state !== saved.state ||
      Date.now() - saved.createdAt > 10 * 60 * 1000
    ) {
      throw new Error("invalid_oauth_state");
    }
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        code,
        code_verifier: saved.verifier,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!tokenResponse.ok) throw new Error("token_exchange_failed");
    const tokens = (await tokenResponse.json()) as Record<string, unknown>;
    if (typeof tokens.access_token !== "string")
      throw new Error("token_missing");
    const profileResponse = await fetch(config.profileUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!profileResponse.ok) throw new Error("profile_failed");
    const profile = (await profileResponse.json()) as {
      email?: string;
      mail?: string;
      userPrincipalName?: string;
    };
    const address = profile.email ?? profile.mail ?? profile.userPrincipalName;
    if (!address) throw new Error("email_missing");
    const encrypted = encryptProviderTokens(
      {
        ...tokens,
        expires_at: Date.now() + Number(tokens.expires_in ?? 3600) * 1000,
      },
      config.key,
    );
    await prisma.$transaction(async (tx) => {
      await tx.emailAccount.upsert({
        where: {
          workspaceId_address: {
            workspaceId: access.workspaceId,
            address: address.toLowerCase(),
          },
        },
        create: {
          workspaceId: access.workspaceId,
          userId: access.userId,
          provider,
          address: address.toLowerCase(),
          active: true,
          config: {
            encrypted,
            scopes: config.scopes,
            connectedAt: new Date().toISOString(),
          },
        },
        update: {
          userId: access.userId,
          provider,
          active: true,
          config: {
            encrypted,
            scopes: config.scopes,
            connectedAt: new Date().toISOString(),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: access.workspaceId,
          userId: access.userId,
          action: "integration.connected",
          recordType: "EmailAccount",
          source: "MANUAL",
          newValue: { provider, address: address.toLowerCase() },
        },
      });
    });
    return NextResponse.redirect(
      new URL(`/connections?connection=${provider}-connected`, request.url),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/connections?connection=failed", request.url),
    );
  }
}
