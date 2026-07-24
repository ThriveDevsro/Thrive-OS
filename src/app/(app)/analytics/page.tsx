import { BarChart3, CheckCircle2, Mail, Radar, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/role-access";

export default async function AnalyticsPage() {
  const { workspace, user, founder } = await getAccessContext();
  const id = workspace.id;
  const [leads, opportunities, tasks, activities] = await Promise.all([
    prisma.lead.findMany({
      where: {
        workspaceId: id,
        ...(!founder ? { assigneeId: user.id } : {}),
      },
      select: { status: true, country: true, serviceCategory: true },
    }),
    prisma.opportunity.findMany({
      where: {
        workspaceId: id,
        ...(!founder ? { ownerId: user.id } : {}),
      },
      include: { stage: true },
    }),
    prisma.task.findMany({
      where: {
        workspaceId: id,
        ...(!founder ? { assigneeId: user.id } : {}),
      },
      select: { status: true, dueAt: true },
    }),
    prisma.activity.count({
      where: {
        workspaceId: id,
        ...(!founder ? { actorId: user.id } : {}),
      },
    }),
  ]);
  const won = opportunities.filter((item) => item.stage.key === "won");
  const pipeline =
    opportunities
      .filter((item) => !item.stage.terminal)
      .reduce((sum, item) => sum + Number(item.valueMinor), 0) / 100;
  const awaitingReview = leads.filter((lead) =>
    ["NEW", "REVIEW", "ASSIGNED"].includes(lead.status),
  ).length;
  const cards = [
    [founder ? "Leads collected" : "My leads", leads.length, Radar],
    ["Leads awaiting action", awaitingReview, TrendingUp],
    [
      founder ? "Open pipeline" : "My pipeline",
      `€${pipeline.toLocaleString("en-GB")}`,
      BarChart3,
    ],
    ["Deals won", won.length, CheckCircle2],
    ["Activities", activities, Mail],
    [
      "Overdue tasks",
      tasks.filter(
        (task) => task.status !== "COMPLETED" && task.dueAt < new Date(),
      ).length,
      TrendingUp,
    ],
  ] as const;
  const services = Object.entries(
    Object.groupBy(leads, (lead) => lead.serviceCategory ?? "Other"),
  )
    .map(([name, items]) => ({ name, count: items?.length ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <div className="list-heading">
        <div>
          <p className="eyebrow">
            PERFORMANCE · {founder ? "COMPANY" : "MY RESULTS"}
          </p>
          <h1>Analytics</h1>
          <p>
            {founder
              ? "Live operational metrics across Thrive Dev"
              : "Your assigned leads, deals, activity and tasks"}
          </p>
        </div>
      </div>
      <section className="analytics-cards">
        {cards.map(([label, value, Icon]) => (
          <article key={label}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <div className="analytics-grid">
        <section>
          <header>
            <h2>Service demand</h2>
          </header>
          {services.length ? (
            services.map((item) => (
              <div className="analytics-bar" key={item.name}>
                <span>{item.name}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.max(8, (item.count / Math.max(1, leads.length)) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))
          ) : (
            <p className="inline-empty">Lead data will appear here.</p>
          )}
        </section>
        <section>
          <header>
            <h2>Conversion snapshot</h2>
          </header>
          <dl>
            <div>
              <dt>Assigned leads</dt>
              <dd>
                {leads.filter((lead) => lead.status === "ASSIGNED").length}
              </dd>
            </div>
            <div>
              <dt>Qualified leads</dt>
              <dd>
                {leads.filter((lead) => lead.status === "QUALIFIED").length}
              </dd>
            </div>
            <div>
              <dt>Open deals</dt>
              <dd>
                {
                  opportunities.filter(
                    (opportunity) => !opportunity.stage.terminal,
                  ).length
                }
              </dd>
            </div>
            <div>
              <dt>Won value</dt>
              <dd>
                {won
                  .map(
                    (opportunity) =>
                      `${opportunity.currency} ${(Number(opportunity.valueMinor) / 100).toLocaleString("en-GB")}`,
                  )
                  .join(" · ") || "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
