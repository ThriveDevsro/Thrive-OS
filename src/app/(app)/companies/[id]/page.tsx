import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronLeft,
  CheckSquare,
  Globe2,
  Mail,
  MapPin,
  Plus,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/role-access";
import { CompanyActivityModal } from "./company-activity-modal";
import { ActivityNoteDialog } from "./activity-note-dialog";
export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace, user, founder } = await getAccessContext();
  const [company, teammates] = await Promise.all([
    prisma.company.findFirst({
    where: {
      id,
      workspaceId: workspace.id,
      deletedAt: null,
      ...(!founder ? { ownerId: user.id } : {}),
    },
    include: {
      contacts: { take: 8, orderBy: { createdAt: "desc" } },
      opportunities: {
        take: 8,
        include: { stage: true },
        orderBy: { updatedAt: "desc" },
      },
      activities: { take: 12, orderBy: { occurredAt: "desc" } },
      tasks: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        take: 8,
        orderBy: { dueAt: "asc" },
      },
      emailThreads: {
        take: 8,
        include: { messages: { take: 1, orderBy: { sentAt: "desc" } } },
        orderBy: { lastMessageAt: "desc" },
      },
      owner: true,
    },
  }),
    prisma.user.findMany({
      where: { workspaceId: workspace.id, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!company) notFound();
  return (
    <>
      <Link href="/companies" className="back-link">
        <ChevronLeft size={15} /> Companies
      </Link>
      <header className="company-header">
        <span className="company-hero-logo">
          {company.name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p className="eyebrow">COMPANY PROFILE</p>
          <h1>{company.name}</h1>
          <p>
            {company.industry ?? "Unclassified"} ·{" "}
            {company.city ?? "Unknown city"}, {company.country ?? "—"}
          </p>
        </div>
        <div className="company-actions">
          <Link href={`/inbox?company=${company.id}`}>
            <Mail size={15} /> Email
          </Link>
          <CompanyActivityModal companyId={company.id} teammates={teammates} />
          <Link className="primary-link" href={`/tasks?new=1&company=${company.id}`}>
            <Plus size={15} /> New task
          </Link>
        </div>
      </header>
      <div className="detail-grid">
        <section className="detail-main">
          <article className="panel overview-panel" id="overview">
            <h2>Relationship overview</h2>
            <div className="overview-grid">
              <Info
                icon={<Globe2 />}
                label="Website"
                value={company.domain ?? "Not available"}
              />
              <Info
                icon={<MapPin />}
                label="Location"
                value={`${company.city ?? "—"}, ${company.country ?? "—"}`}
              />
              <Info
                icon={<UserRound />}
                label="Owner"
                value={company.owner?.name ?? "Unassigned"}
              />
              <Info
                icon={<BriefcaseBusiness />}
                label="Lifecycle"
                value={company.lifecycleStatus.toLowerCase()}
              />
            </div>
          </article>
          <article className="panel timeline-panel" id="activity">
            <h2>Recent activity</h2>
            {company.activities.length ? (
              company.activities.map((activity) => (
                <ActivityNoteDialog
                  key={activity.id}
                  title={activity.title}
                  body={activity.body ?? activity.type}
                  date={activity.occurredAt.toLocaleString("en-GB")}
                />
              ))
            ) : (
              <div className="inline-empty">
                No activity yet. Every email, call, note and change will appear
                here.
              </div>
            )}
          </article>
          <article className="panel mini-panel company-email-panel" id="emails">
            <header>
              <h2>Email conversations</h2>
              <Link href={`/inbox?company=${company.id}`}>Open inbox</Link>
            </header>
            {company.emailThreads.length ? company.emailThreads.map((thread) => (
              <Link className="company-thread" href={`/inbox?thread=${thread.id}`} key={thread.id}>
                <span><Mail size={14} /></span>
                <div>
                  <strong>{thread.subject}</strong>
                  <small>{thread.messages[0]?.sender ?? "Email conversation"} · {thread.lastMessageAt?.toLocaleString("en-GB") ?? "No messages"}</small>
                </div>
              </Link>
            )) : <div className="inline-empty">No synced email conversations for this company.</div>}
          </article>
        </section>
        <aside className="detail-side">
          <article className="panel mini-panel" id="contacts">
            <header>
              <h2>Contacts</h2>
            </header>
            {company.contacts.length ? (
              company.contacts.map((contact) => (
                <div className="mini-person" key={contact.id}>
                  <span>
                    {contact.firstName[0]}
                    {contact.lastName[0]}
                  </span>
                  <div>
                    <strong>
                      {contact.firstName} {contact.lastName}
                    </strong>
                    <small>
                      {contact.jobTitle ?? contact.email ?? "Contact"}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div className="inline-empty">No contacts linked.</div>
            )}
          </article>
          <article className="panel mini-panel" id="deals">
            <header>
              <h2>Open deals</h2>
              <Link href="/deals">View all</Link>
            </header>
            {company.opportunities.length ? (
              company.opportunities.map((item) => (
                <div className="mini-opportunity" key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.stage.name}</span>
                </div>
              ))
            ) : (
              <div className="inline-empty">No opportunities yet.</div>
            )}
          </article>
          <article className="panel mini-panel" id="tasks">
            <header>
              <h2>Open tasks</h2>
              <Link className="mini-add-action" href={`/tasks?new=1&company=${company.id}`}><Plus size={13}/> New task</Link>
            </header>
            {company.tasks.length ? company.tasks.map((task) => (
              <div className="company-task" key={task.id}>
                <CheckSquare size={14} />
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.dueAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                </div>
              </div>
            )) : <div className="inline-empty">No open tasks.</div>}
          </article>
        </aside>
      </div>
    </>
  );
}
function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="info-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
