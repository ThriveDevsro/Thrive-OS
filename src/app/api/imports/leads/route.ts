import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateImport } from "@/lib/imports/leads/auth";
import { checkImportRateLimit } from "@/lib/imports/leads/rate-limit";
import { MAX_IMPORT_BODY_BYTES, leadImportSchema } from "@/lib/imports/leads/schema";
import { importLead } from "@/lib/imports/leads/service";

function response(body: object, status: number, requestId: string, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId, ...headers } });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const authorization = request.headers.get("authorization");
  if (!authenticateImport(authorization)) {
    return response({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid import credentials", requestId } }, 401, requestId);
  }

  const clientAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const keyFingerprint = createHash("sha256").update(authorization ?? "").digest("hex").slice(0, 16);
  const rateLimit = checkImportRateLimit(`${keyFingerprint}:${clientAddress}`);
  if (!rateLimit.allowed) {
    return response(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many import requests", requestId } },
      429,
      requestId,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_IMPORT_BODY_BYTES) {
    return response({ success: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Payload exceeds 256 KB", requestId } }, 413, requestId);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return response({ success: false, error: { code: "INVALID_BODY", message: "Request body could not be read", requestId } }, 400, requestId);
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_IMPORT_BODY_BYTES) {
    return response({ success: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Payload exceeds 256 KB", requestId } }, 413, requestId);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return response({ success: false, error: { code: "INVALID_JSON", message: "Request body must be valid JSON", requestId } }, 400, requestId);
  }
  const parsed = leadImportSchema.safeParse(body);
  if (!parsed.success) {
    return response({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Import payload is invalid",
        fieldErrors: parsed.error.flatten().fieldErrors,
        requestId,
      },
    }, 400, requestId);
  }

  try {
    const result = await importLead(parsed.data);
    return response({ success: true, ...result }, result.duplicate ? 200 : 201, requestId);
  } catch {
    return response({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "The lead import could not be processed", requestId },
    }, 500, requestId);
  }
}
