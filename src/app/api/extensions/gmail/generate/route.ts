import {
  generateGmailEmail,
  GmailGenerateError,
  gmailGenerateInput,
  type ExtensionAccess,
  type GmailGenerateInput,
} from "@/lib/extensions/gmail-generate";
import { authenticateExtension } from "@/lib/extensions/auth";

type Dependencies = {
  authenticate(request: Request): Promise<ExtensionAccess | null>;
  generate(
    access: ExtensionAccess,
    input: GmailGenerateInput,
  ): Promise<{ text: string }>;
  log(error: unknown): void;
};

const productionDependencies: Dependencies = {
  authenticate: authenticateExtension,
  generate: generateGmailEmail,
  log(error) {
    const safe =
      error instanceof GmailGenerateError
        ? { name: error.name, code: error.code, status: error.status }
        : { name: error instanceof Error ? error.name : "UnknownError" };
    console.error("gmail_extension_generate_failed", safe);
  },
};

export function createGmailGenerateHandler(
  dependencies: Dependencies = productionDependencies,
) {
  return async function POST(request: Request) {
    const access = await dependencies.authenticate(request);
    if (!access) {
      return jsonError(401, "INVALID_TOKEN", "The Workspace extension token is invalid.");
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_REQUEST", "The request body must be valid JSON.");
    }
    const parsed = gmailGenerateInput.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "INVALID_REQUEST", "The email generation request is invalid.");
    }
    try {
      const result = await dependencies.generate(access, parsed.data);
      return Response.json(
        { text: result.text },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      dependencies.log(error);
      if (error instanceof GmailGenerateError) {
        return jsonError(error.status, error.code, error.message);
      }
      return jsonError(500, "AI_GENERATION_FAILED", "The email could not be generated.");
    }
  };
}

export const POST = createGmailGenerateHandler();

function jsonError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
