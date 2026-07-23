import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAiAccessContext } from "@/lib/ai/access";
import { AiError } from "@/lib/ai/errors";
import {
  createPkce,
  oauthConfig,
  type OAuthProvider,
} from "@/lib/integrations/oauth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await params;
  if (rawProvider !== "google" && rawProvider !== "microsoft") {
    return NextResponse.redirect(
      new URL("/connections?connection=invalid", _request.url),
    );
  }
  try {
    await getAiAccessContext();
    const provider = rawProvider as OAuthProvider;
    const config = oauthConfig(provider);
    const pkce = createPkce();
    const cookieStore = await cookies();
    cookieStore.set(
      `thrive_oauth_${provider}`,
      JSON.stringify({
        state: pkce.state,
        verifier: pkce.verifier,
        createdAt: Date.now(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/api/integrations/${provider}`,
        maxAge: 600,
      },
    );
    const authorization = new URL(config.authorizationUrl);
    authorization.searchParams.set("client_id", config.clientId);
    authorization.searchParams.set("redirect_uri", config.redirectUri);
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("scope", config.scopes.join(" "));
    authorization.searchParams.set("state", pkce.state);
    authorization.searchParams.set("code_challenge", pkce.challenge);
    authorization.searchParams.set("code_challenge_method", "S256");
    if (provider === "google") {
      authorization.searchParams.set("access_type", "offline");
      authorization.searchParams.set("prompt", "consent");
    }
    return NextResponse.redirect(authorization);
  } catch (error) {
    const code = error instanceof AiError ? error.code : "AI_CONFIG_INVALID";
    return NextResponse.redirect(
      new URL(`/connections?connection=${code}`, _request.url),
    );
  }
}
