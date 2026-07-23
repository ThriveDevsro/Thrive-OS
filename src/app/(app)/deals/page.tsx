import Link from "next/link";
import { Columns3, List, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/role-access";
import { moveOpportunity } from "./actions";
import { DealModal } from "./deal-modal";

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const { view = "list", q = "" } = await searchParams;
  const { workspace, user, founder } = await getAccessContext();
  const [stages, companies] = await Promise.all([
    prisma.opportunityStage.findMany({
      where: { workspaceId: workspace.id },
      include: { opportunities: { where: { ...(!founder ? { ownerId: user.id } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { company: { name: { contains: q, mode: "insensitive" as const } } }] } : {}) }, include: { company: true, owner: true }, orderBy: { updatedAt: "desc" } } },
      orderBy: { position: "asc" },
    }),
    prisma.company.findMany({ where: { workspaceId: workspace.id, deletedAt: null, ...(!founder ? { ownerId: user.id } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const active = stages.filter(stage => !stage.terminal && stage.key !== "paused");
  const deals = active.flatMap(stage => stage.opportunities.map(deal => ({ ...deal, stage })));
  const total = deals.reduce((sum, deal) => sum + Number(deal.valueMinor), 0) / 100;

  return <>
    <div className="list-heading"><div><p className="eyebrow">SALES</p><h1>Deals</h1><p>{deals.length} open deals · €{total.toLocaleString("en-GB")} pipeline</p></div><DealModal companies={companies} stages={active.map(({ id, name }) => ({ id, name }))} /></div>
    <nav className="view-tabs">
      <Link className={view !== "pipeline" ? "active" : ""} href="/deals"><List size={15} /> All deals</Link>
      <Link className={view === "pipeline" ? "active" : ""} href="/deals?view=pipeline"><Columns3 size={15} /> Pipeline</Link>
    </nav>
    <form className="list-toolbar"><input type="hidden" name="view" value={view} /><div className="table-search"><Search size={16} /><input name="q" defaultValue={q} placeholder="Search deals or companies" /></div><button>Search</button></form>
    {view === "pipeline" ? <section className="kanban">
      {active.map(stage => <div className="kanban-column" key={stage.id}><header><strong>{stage.name}</strong><span>{stage.opportunities.length}</span></header>
        {stage.opportunities.map(item => <article key={item.id}><strong>{item.name}</strong><Link href={`/companies/${item.companyId}`}>{item.company.name}</Link><b>{item.currency} {(Number(item.valueMinor) / 100).toLocaleString("en-GB")}</b><small>Next: {item.nextStep} · {item.nextStepAt?.toLocaleDateString("en-GB")}</small><form action={moveOpportunity}><input type="hidden" name="id" value={item.id} /><select name="stageId" defaultValue={stage.id}>{stages.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select><button>Move</button></form></article>)}
      </div>)}
    </section> : <section className="data-card"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Deal</th><th>Stage</th><th>Company</th><th>Owner</th><th>Amount</th><th>Next step</th></tr></thead><tbody>
      {deals.map(deal => <tr key={deal.id}><td><strong>{deal.name}</strong></td><td><span className="deal-stage">{deal.stage.name}</span></td><td><Link className="table-company-link" href={`/companies/${deal.companyId}`}>{deal.company.name}</Link></td><td>{deal.owner?.name ?? "Unassigned"}</td><td><strong>{deal.currency} {(Number(deal.valueMinor) / 100).toLocaleString("en-GB")}</strong></td><td>{deal.nextStep}<small>{deal.nextStepAt?.toLocaleDateString("en-GB")}</small></td></tr>)}
    </tbody></table></div></section>}
  </>;
}
