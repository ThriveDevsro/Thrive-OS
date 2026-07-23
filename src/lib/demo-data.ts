export const metrics = [
  { label: "New leads", value: "18", detail: "+24% this week", tone: "blue" },
  { label: "Waiting for review", value: "7", detail: "3 high priority", tone: "amber" },
  { label: "Pipeline value", value: "€184,500", detail: "€92,340 weighted", tone: "navy" },
  { label: "Follow-ups overdue", value: "4", detail: "Oldest: 2 days", tone: "red" },
] as const;

export const activities = [
  { initials: "MK", name: "Martin Kováč", action: "sent a proposal to", target: "Northpeak Logistics", time: "12 min", color: "#3b82f6" },
  { initials: "PS", name: "Petra Sláviková", action: "qualified an opportunity for", target: "Morava Energy", time: "36 min", color: "#8b5cf6" },
  { initials: "AI", name: "Lead Radar", action: "collected 6 new leads from", target: "approved sources", time: "1 hr", color: "#10b981" },
  { initials: "MK", name: "Martin Kováč", action: "booked a discovery with", target: "Brighton & Finch", time: "2 hr", color: "#3b82f6" },
] as const;

export const tasks = [
  { title: "Follow up on CRM proposal", company: "Northpeak Logistics", due: "Today, 13:00", priority: "High" },
  { title: "Review automation brief", company: "Tatry Foods", due: "Today, 15:30", priority: "Normal" },
  { title: "Prepare discovery agenda", company: "Brighton & Finch", due: "Tomorrow, 09:00", priority: "Normal" },
] as const;

export const pipeline = [
  { stage: "Qualified", value: 82, amount: "€62.5k", color: "#60a5fa" },
  { stage: "Discovery", value: 64, amount: "€48.0k", color: "#818cf8" },
  { stage: "Proposal sent", value: 46, amount: "€39.5k", color: "#a78bfa" },
  { stage: "Negotiation", value: 31, amount: "€34.5k", color: "#34d399" },
] as const;
