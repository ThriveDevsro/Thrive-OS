import { describe, expect, it } from "vitest";
import { can, capabilitiesFor } from "./permissions";

describe("capability policy", () => {
  it("allows the founder to inspect audit history", () => expect(can("founder", "audit.read")).toBe(true));
  it("prevents a salesperson from team-wide lead assignment", () => expect(can("salesperson", "lead.assign")).toBe(false));
  it("allows a salesperson to send CRM email", () => expect(can("salesperson", "email.send")).toBe(true));
  it("allows a programmer to use AI without team administration", () => {
    expect(can("programmer", "ai.copilot.use")).toBe(true);
    expect(can("programmer", "team.manage")).toBe(false);
  });
  it("does not duplicate seeded capabilities", () => expect(new Set(capabilitiesFor("founder")).size).toBe(capabilitiesFor("founder").length));
});
