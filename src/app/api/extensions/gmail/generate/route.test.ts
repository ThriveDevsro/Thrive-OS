import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { GmailGenerateError } from "@/lib/extensions/gmail-generate";
import { createGmailGenerateHandler } from "./route";

const access = {
  workspaceId: "10000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000002",
  tokenId: "10000000-0000-4000-8000-000000000003",
};

const validBody = {
  action: "reply",
  instruction: "Reply and propose the documented next step.",
  tone: "professional",
  language: "English",
  sourceText: "Thank you. What happens next?",
  composeContext: {
    to: ["client@example.com"],
    cc: [],
    bcc: [],
    subject: "Re: Project",
    body: "",
  },
};

describe("POST /api/extensions/gmail/generate", () => {
  it("returns 401 before processing the body for an invalid token", async () => {
    const generate = vi.fn();
    const handler = createGmailGenerateHandler({
      authenticate: vi.fn().mockResolvedValue(null),
      generate,
      log: vi.fn(),
    });
    const response = await handler(request("{not-json"));
    expect(response.status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_TOKEN",
        message: "The Workspace extension token is invalid.",
      },
    });
  });

  it("returns 400 for malformed or invalid input", async () => {
    const handler = createGmailGenerateHandler({
      authenticate: vi.fn().mockResolvedValue(access),
      generate: vi.fn(),
      log: vi.fn(),
    });
    expect((await handler(request("{not-json"))).status).toBe(400);
    expect((await handler(request(JSON.stringify({ action: "reply" })))).status).toBe(
      400,
    );
  });

  it("returns exactly the generated text object", async () => {
    const handler = createGmailGenerateHandler({
      authenticate: vi.fn().mockResolvedValue(access),
      generate: vi.fn().mockResolvedValue({ text: "Hello from Thrive." }),
      log: vi.fn(),
    });
    const response = await handler(request(JSON.stringify(validBody)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "Hello from Thrive." });
  });

  it("returns 404 when no CRM context matches", async () => {
    const handler = createGmailGenerateHandler({
      authenticate: vi.fn().mockResolvedValue(access),
      generate: vi.fn().mockRejectedValue(
        new GmailGenerateError(
          "CRM_CONTEXT_NOT_FOUND",
          404,
          "No accessible CRM contact matches the email recipients.",
        ),
      ),
      log: vi.fn(),
    });
    const response = await handler(request(JSON.stringify(validBody)));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "CRM_CONTEXT_NOT_FOUND",
        message: "No accessible CRM contact matches the email recipients.",
      },
    });
  });

  it("returns 500 and logs only the safe error object", async () => {
    const log = vi.fn();
    const handler = createGmailGenerateHandler({
      authenticate: vi.fn().mockResolvedValue(access),
      generate: vi.fn().mockRejectedValue(
        new GmailGenerateError(
          "AI_GENERATION_FAILED",
          500,
          "The email could not be generated.",
        ),
      ),
      log,
    });
    const response = await handler(request(JSON.stringify(validBody), "secret-token"));
    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-token");
  });
});

function request(body: string, token = "test-token") {
  return new Request("https://app.thrivedev.co/api/extensions/gmail/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });
}
