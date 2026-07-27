import { describe, expect, it } from "vitest";
import { buildMimeMessage } from "./mime";

describe("Gmail MIME messages", () => {
  it("builds a safe UTF-8 message", () => {
    const message = buildMimeMessage({
      from: "sales@thrivedev.co",
      to: "client@example.com",
      subject: "Ponuka pre klienta",
      body: "Dobrý deň,\nďakujeme.",
      messageId: "<message-1@thrivedev.co>",
    });

    expect(message).toContain("From: sales@thrivedev.co");
    expect(message).toContain("To: client@example.com");
    expect(message).toContain("Subject: =?UTF-8?B?");
    expect(message).toContain("Content-Transfer-Encoding: base64");
    expect(message).not.toContain("Dobrý deň");
  });

  it("adds reply headers and strips header injection", () => {
    const message = buildMimeMessage({
      from: "sales@thrivedev.co\r\nBcc: attacker@example.com",
      to: "client@example.com",
      subject: "Re: Hello",
      body: "Reply",
      messageId: "<message-2@thrivedev.co>",
      inReplyTo: "<original@example.com>",
    });

    expect(message).toContain("In-Reply-To: <original@example.com>");
    expect(message).toContain("References: <original@example.com>");
    expect(message).not.toContain("\r\nBcc:");
  });
});
