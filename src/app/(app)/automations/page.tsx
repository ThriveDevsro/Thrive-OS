import { Activity, Power, Workflow } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/role-access";
import { toggleAutomation } from "./actions";

export default async function AutomationsPage(){await requireFounder();const workspace=await prisma.workspace.findUnique({where:{slug:"thrive-dev"}});const items=await prisma.automation.findMany({where:{workspaceId:workspace?.id},include:{runs:{orderBy:{startedAt:"desc"},take:1}},orderBy:{name:"asc"}});return <><div className="list-heading"><div><p className="eyebrow">AUTOMATIONS</p><h1>Automations</h1><p>Simple rules that keep routine CRM work moving</p></div></div><section className="automation-list">{items.length?items.map(item=><article key={item.id}><span><Workflow/></span><div><strong>{item.name}</strong><p>{triggerLabel(item.trigger)} · {actionCount(item.actions)}</p><small><Activity size={11}/>{item.runs[0]?`Last run ${item.runs[0].startedAt.toLocaleString("en-GB")} · ${statusLabel(item.runs[0].status)}`:"Not run yet"}</small></div><b className={item.active?"active":""}>{item.active?"On":"Off"}</b><form action={toggleAutomation}><input type="hidden" name="id" value={item.id}/><button className={item.active?"danger":""}><Power size={14}/>{item.active?"Turn off":"Turn on"}</button></form></article>):<div className="empty-state"><Workflow size={28}/><h2>No automations yet</h2><p>Safe automation templates will appear here.</p></div>}</section></>}

function triggerLabel(value: unknown) {
  const trigger = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const event = String(trigger.event ?? trigger.type ?? "");
  const labels: Record<string, string> = {
    "email.received": "When a CRM email arrives",
    "email.sent": "When a CRM email is sent",
    "lead.created": "When a new lead is imported",
    "opportunity.stage_changed": "When a deal changes stage",
    "no_activity": "When a record has no activity",
  };
  return labels[event] ?? "CRM event";
}

function actionCount(value: unknown) {
  const count = Array.isArray(value) ? value.length : 1;
  return `${count} ${count === 1 ? "action" : "actions"}`;
}

function statusLabel(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}
