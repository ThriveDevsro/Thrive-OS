import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Inbox,
  Radar,
  UsersRound,
} from "lucide-react";

type Props = {
  firstName: string;
  role: "founder" | "salesperson";
  metrics: {
    companyCount: number;
    attentionLeads: number;
    pipelineValue: number;
    weightedValue: number;
    openDeals: number;
    overdue: number;
    dueToday: number;
    openInbox: number;
  };
  pipeline: { stage: string; count: number; value: number }[];
  leads: {
    id: string;
    title: string;
    status: string;
    company: string;
    owner: string;
  }[];
  tasks: {
    id: string;
    title: string;
    company: string;
    dueAt: Date;
    priority: string;
    owner: string;
  }[];
  meetings: { id: string; title: string; startsAt: Date; company: string }[];
  activities: {
    id: string;
    title: string;
    company: string;
    occurredAt: Date;
  }[];
};

export function Dashboard({
  firstName,
  role,
  metrics,
  pipeline,
  leads,
  tasks,
  meetings,
  activities,
}: Props) {
  const founder = role === "founder";
  const maxPipeline = Math.max(...pipeline.map((item) => item.value), 1);
  return (
    <>
      <div className="page-heading role-dashboard-heading">
        <div>
          <p className="eyebrow">
            {new Date()
              .toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
              .toUpperCase()}
          </p>
          <h1>
            Good {dayPart()}, {firstName}.
          </h1>
          <p>
            {founder
              ? "Here is what needs attention across Thrive Dev today."
              : "Your leads, deals and next actions for today."}
          </p>
        </div>
        <span className="dashboard-scope">
          {founder ? (
            <>
              <UsersRound />
              Company view
            </>
          ) : (
            <>
              <UsersRound />
              My work
            </>
          )}
        </span>
      </div>
      <section className="dashboard-priority-grid">
        <Metric
          icon={<Radar />}
          label={founder ? "Leads to review" : "My priority leads"}
          value={metrics.attentionLeads}
          detail="New, unreviewed or unassigned"
          href="/lead-radar"
          tone={metrics.attentionLeads ? "amber" : "green"}
        />
        <Metric
          icon={<BriefcaseBusiness />}
          label={founder ? "Open pipeline" : "My open pipeline"}
          value={money(metrics.pipelineValue)}
          detail={`${metrics.openDeals} active deals · ${money(metrics.weightedValue)} weighted`}
          href="/deals"
          tone="blue"
        />
        <Metric
          icon={<Clock3 />}
          label="Tasks needing attention"
          value={metrics.overdue + metrics.dueToday}
          detail={`${metrics.overdue} overdue · ${metrics.dueToday} due today`}
          href="/tasks"
          tone={metrics.overdue ? "red" : "green"}
        />
        <Metric
          icon={<Inbox />}
          label="Open conversations"
          value={metrics.openInbox}
          detail={`${metrics.companyCount} ${founder ? "companies" : "owned companies"}`}
          href="/inbox"
          tone="violet"
        />
      </section>
      <section className="role-dashboard-grid">
        <article className="panel attention-panel">
          <DashboardHead
            title="Priority leads"
            subtitle={
              founder
                ? "Newest leads waiting for a decision"
                : "Your newest leads waiting for action"
            }
            href="/lead-radar"
          />
          {leads.length ? (
            <div className="priority-lead-list">
              {leads.map((item) => (
                <Link href={`/lead-radar?lead=${item.id}`} key={item.id}>
                  <span><Radar /></span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.status.toLowerCase()} · {item.company} · {item.owner}
                    </small>
                  </div>
                  <ArrowRight />
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              icon={<CheckCircle2 />}
              text="No high-priority leads waiting."
            />
          )}
        </article>
        <article className="panel live-pipeline-panel">
          <DashboardHead
            title="Pipeline"
            subtitle={
              founder ? "Open value by stage" : "Your open value by stage"
            }
            href="/deals"
          />
          <div className="pipeline-numbers">
            <div>
              <span>Total</span>
              <strong>{money(metrics.pipelineValue)}</strong>
            </div>
            <div>
              <span>Weighted</span>
              <strong>{money(metrics.weightedValue)}</strong>
            </div>
          </div>
          {pipeline.length ? (
            <div className="live-pipeline-bars">
              {pipeline.map((item) => (
                <div key={item.stage}>
                  <header>
                    <span>{item.stage}</span>
                    <b>
                      {item.count} · {money(item.value)}
                    </b>
                  </header>
                  <i>
                    <em
                      style={{
                        width: `${Math.max(5, (item.value / maxPipeline) * 100)}%`,
                      }}
                    />
                  </i>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={<BarChart3 />} text="No open deals yet." />
          )}
        </article>
        <article className="panel today-tasks-panel">
          <DashboardHead
            title="Next actions"
            subtitle={founder ? "Most urgent team tasks" : "Your next tasks"}
            href="/tasks"
          />
          {tasks.length ? (
            <div>
              {tasks.map((item) => (
                <Link href="/tasks" key={item.id}>
                  <span className={item.dueAt < new Date() ? "overdue" : ""}>
                    <Clock3 />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.company}
                      {founder ? ` · ${item.owner}` : ""}
                    </small>
                  </div>
                  <time>
                    {item.dueAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <b className={`priority-${item.priority.toLowerCase()}`}>
                    {item.priority.toLowerCase()}
                  </b>
                </Link>
              ))}
            </div>
          ) : (
            <Empty icon={<CheckCircle2 />} text="No open tasks." />
          )}
        </article>
        <article className="panel dashboard-meetings">
          <DashboardHead
            title="Upcoming"
            subtitle="Meetings and company events"
            href="/calendar"
          />
          {meetings.length ? (
            <div>
              {meetings.map((item) => (
                <Link href="/calendar" key={item.id}>
                  <span>
                    <CalendarClock />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.company}</small>
                  </div>
                  <time>
                    {item.startsAt.toLocaleString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </Link>
              ))}
            </div>
          ) : (
            <Empty icon={<CalendarClock />} text="No upcoming meetings." />
          )}
        </article>
        {founder && (
          <article className="panel dashboard-activity">
            <DashboardHead
              title="Recent company activity"
              subtitle="Latest recorded work across Thrive Dev"
              href="/analytics"
            />
            {activities.length ? (
              <div>
                {activities.map((item) => (
                  <div key={item.id}>
                    <span>
                      <Building2 />
                    </span>
                    <p>
                      <strong>{item.title}</strong>
                      <small>
                        {item.company} · {relative(item.occurredAt)}
                      </small>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={<Building2 />} text="No recent activity." />
            )}
          </article>
        )}
      </section>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  href: string;
  tone: string;
}) {
  return (
    <Link className={`priority-metric ${tone}`} href={href}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
      <ArrowRight />
    </Link>
  );
}
function DashboardHead({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <header className="dashboard-panel-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <Link href={href}>
        View all <ArrowRight />
      </Link>
    </header>
  );
}
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="dashboard-empty">
      {icon}
      <span>{text}</span>
    </div>
  );
}
function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
function dayPart() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
function relative(date: Date) {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - date.getTime()) / 60000),
  );
  return minutes < 60
    ? `${minutes}m ago`
    : minutes < 1440
      ? `${Math.round(minutes / 60)}h ago`
      : `${Math.round(minutes / 1440)}d ago`;
}
