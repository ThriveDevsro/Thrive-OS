import { describe, expect, it } from "vitest";
import { buildTeamInvitationHtml } from "./resend";

describe("team invitation email", () => {
  it("renders the Thrive branding and invitation details", () => {
    const html = buildTeamInvitationHtml({
      name: "Patrik Korec",
      invitedBy: "Thrive Dev",
      inviteUrl: "https://example.com/accept-invite/token",
      logoUrl: "https://example.com/thrive-dev-logo.png",
    });

    expect(html).toContain("thrive-dev-logo.png");
    expect(html).toContain("#000000");
    expect(html).toContain("#2563eb");
    expect(html).toContain("Accept invitation");
    expect(html).toContain("Hi Patrik, you’re invited to Thrive OS");
    expect(html).not.toContain("Hi Patrik Korec");
    expect(html).toContain("This invitation link expires in 24 hours.");
    expect(html).toContain('href="https://app.thrivedev.co"');
  });

  it("supports an embedded logo for email clients", () => {
    const html = buildTeamInvitationHtml({
      name: "Patrik Korec",
      invitedBy: "Thrive Dev",
      inviteUrl: "https://example.com/accept-invite/token",
      logoUrl: "cid:thrive-dev-logo",
    });

    expect(html).toContain('src="cid:thrive-dev-logo"');
  });

  it("escapes user-controlled values", () => {
    const html = buildTeamInvitationHtml({
      name: '<script>alert("x")</script>',
      invitedBy: "A & B",
      inviteUrl: 'https://example.com/?a=1&b="2"',
      logoUrl: "https://example.com/logo.png",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B");
    expect(html).toContain("a=1&amp;b=&quot;2&quot;");
  });
});
