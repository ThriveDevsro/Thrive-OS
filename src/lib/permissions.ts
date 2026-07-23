export const capabilities = [
  "dashboard.read.all",
  "dashboard.read.owned",
  "company.read.all",
  "company.read.owned",
  "company.update.owned",
  "lead.read.all",
  "lead.read.owned",
  "lead.assign",
  "opportunity.update.owned",
  "email.send",
  "analytics.read.all",
  "analytics.read.owned",
  "team.manage",
  "audit.read",
  "ai.lead.analyze.all",
  "ai.lead.analyze.owned",
  "ai.lead.force_rerun",
  "ai.analysis.approve",
  "ai.copilot.use",
] as const;

export type Capability = (typeof capabilities)[number];
export type SystemRole = "founder" | "salesperson";

const roleCapabilities: Record<SystemRole, readonly Capability[]> = {
  founder: capabilities,
  salesperson: [
    "dashboard.read.owned",
    "company.read.owned",
    "company.update.owned",
    "lead.read.owned",
    "opportunity.update.owned",
    "email.send",
    "analytics.read.owned",
    "ai.lead.analyze.owned",
    "ai.analysis.approve",
    "ai.copilot.use",
  ],
};

export function can(role: SystemRole, capability: Capability): boolean {
  return roleCapabilities[role]?.includes(capability) ?? false;
}

export function capabilitiesFor(role: SystemRole): readonly Capability[] {
  return roleCapabilities[role];
}
