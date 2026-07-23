import Link from "next/link";
import {
  Check,
  ExternalLink,
  Filter,
  Inbox,
  Radar,
  Search,
  X,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/role-access";
import { createDealFromLead, setImportDecision } from "./actions";
import { LeadModal } from "./lead-modal";
import { AiAnalysisPanel } from "./ai-analysis-panel";
import { LeadBatchCheckbox, LeadBatchControls } from "./lead-batch-controls";
import { InlineLeadOwner } from "./inline-lead-owner";
import { isAiEnabled } from "@/lib/ai/config";
import {
  analysisSelect,
  serializeAnalysis,
} from "@/lib/ai/lead-analysis/service";

type Params = { view?: string; status?: string; source?: string; q?: string };

export default async function LeadRadarPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const { workspace, user, founder } = await getAccessContext();
  const inbox = params.view !== "all";
  const status = params.status || (inbox ? "NEW" : "");
  const q = params.q?.trim() ?? "";
  const source = params.source ?? "";

  const [events, allLeads, users, sources] = await Promise.all([
    prisma.importEvent.findMany({
      where: {
        workspaceId: workspace.id,
        ...(status ? { status } : {}),
        ...(source ? { sourceName: source } : {}),
        ...(q ? { lead: { title: { contains: q, mode: "insensitive" } } } : {}),
        ...(!founder
          ? {
              lead: {
                assigneeId: user.id,
                ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
              },
            }
          : {}),
      },
      include: {
        lead: {
          include: {
            company: true,
            contact: true,
            assignee: true,
            source: true,
            aiAnalyses: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: analysisSelect,
            },
          },
        },
      },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
    prisma.lead.findMany({
      where: {
        workspaceId: workspace.id,
        ...(!founder ? { assigneeId: user.id } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { source: true, assignee: true, company: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { workspaceId: workspace.id, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.importEvent.findMany({
      where: { workspaceId: workspace.id },
      distinct: ["sourceName"],
      select: { sourceName: true },
      orderBy: { sourceName: "asc" },
    }),
  ]);

  const newCount = await prisma.importEvent.count({
    where: { workspaceId: workspace.id, status: "NEW" },
  });

  return (
    <>
      <div className="list-heading lead-heading">
        <div>
          <p className="eyebrow">LEADS</p>
          <h1>Lead Inbox</h1>
          <p>Review incoming opportunities and move the good ones forward.</p>
        </div>
        <LeadModal />
      </div>

      <nav className="view-tabs lead-tabs">
        <Link className={inbox ? "active" : ""} href="/lead-radar">
          <Inbox size={15} /> Inbox <span>{newCount}</span>
        </Link>
        <Link className={!inbox ? "active" : ""} href="/lead-radar?view=all">
          <Radar size={15} /> All leads <span>{allLeads.length}</span>
        </Link>
      </nav>

      <form className="list-toolbar lead-toolbar">
        {!inbox && <input type="hidden" name="view" value="all" />}
        <div className="table-search">
          <Search size={16} />
          <input name="q" defaultValue={q} placeholder="Search leads" />
        </div>
        {inbox && (
          <>
            <select name="status" defaultValue={status}>
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="DUPLICATE">Duplicates</option>
              <option value="FAILED">Failed</option>
            </select>
            <select name="source" defaultValue={source}>
              <option value="">All sources</option>
              {sources.map((item) => (
                <option key={item.sourceName}>{item.sourceName}</option>
              ))}
            </select>
          </>
        )}
        <button>
          <Filter size={15} /> Filter
        </button>
      </form>

      {inbox ? (
        <>
        <LeadBatchControls ids={events.flatMap((event) => event.lead ? [event.id] : [])} users={users} />
        <section className="lead-inbox batch-enabled">
          {events.length ? (
            events.map(
              (event) =>
                event.lead && (
                  <article className="lead-inbox-row" key={event.id}>
                    <LeadBatchCheckbox id={event.id} />
                    <div
                      className={`lead-score ${event.lead.score >= 75 ? "high" : event.lead.score >= 50 ? "medium" : ""}`}
                    >
                      {event.lead.score}
                    </div>
                    <div className="lead-primary">
                      <div>
                        <span
                          className={`import-status status-${event.status.toLowerCase()}`}
                        >
                          {event.status.toLowerCase()}
                        </span>
                        <small>
                          {event.sourceName} ·{" "}
                          {event.receivedAt.toLocaleDateString("en-GB")}
                        </small>
                      </div>
                      <strong>{event.lead.title}</strong>
                      <p>
                        {event.lead.description ||
                          "No additional description was supplied."}
                      </p>
                      <small>
                        {event.lead.company?.name ?? "No linked company"}
                        {event.lead.contact
                          ? ` · ${event.lead.contact.firstName} ${event.lead.contact.lastName}`
                          : ""}
                      </small>
                    </div>
                    <InlineLeadOwner
                      leadId={event.lead.id}
                      assigneeId={event.lead.assigneeId}
                      users={users}
                    />
                    <div className="lead-actions">
                      {event.sourceUrl && (
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={15} /> Source
                        </a>
                      )}
                      {event.status === "NEW" && (
                        <>
                          <form action={setImportDecision}>
                            <input
                              type="hidden"
                              name="importId"
                              value={event.id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="REJECTED"
                            />
                            <button className="reject">
                              <X size={15} /> Reject
                            </button>
                          </form>
                          <form action={setImportDecision}>
                            <input
                              type="hidden"
                              name="importId"
                              value={event.id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="ACCEPTED"
                            />
                            <button>
                              <Check size={15} /> Accept
                            </button>
                          </form>
                          {event.lead.companyId && (
                            <form action={createDealFromLead}>
                              <input
                                type="hidden"
                                name="leadId"
                                value={event.lead.id}
                              />
                              <input
                                type="hidden"
                                name="importId"
                                value={event.id}
                              />
                              <button className="primary-action">
                                Create deal
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                    <AiAnalysisPanel
                      leadId={event.lead.id}
                      enabled={isAiEnabled()}
                      canForceRerun={founder}
                      initialAnalysis={
                        event.lead.aiAnalyses[0]
                          ? serializeAnalysis(event.lead.aiAnalyses[0])
                          : null
                      }
                    />
                  </article>
                ),
            )
          ) : (
            <div className="empty-state">
              <Inbox size={30} />
              <h2>Inbox is clear</h2>
              <p>No imported leads match these filters.</p>
            </div>
          )}
        </section>
        </>
      ) : (
        <section className="data-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Source</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {allLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.title}</strong>
                      <small>{lead.company?.name ?? "Unlinked company"}</small>
                    </td>
                    <td>{lead.source?.name ?? "Manual"}</td>
                    <td>
                      <span className="score-pill">{lead.score}</span>
                    </td>
                    <td>
                      <span className="import-status">
                        {lead.status.toLowerCase()}
                      </span>
                    </td>
                    <td>{lead.assignee?.name ?? "Unassigned"}</td>
                    <td>
                      {lead.sourceUrl && (
                        <a
                          href={lead.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
