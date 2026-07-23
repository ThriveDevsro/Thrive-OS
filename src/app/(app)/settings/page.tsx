import {
  Activity,
  Check,
  Database,
  ExternalLink,
  KeyRound,
  Mail,
  Radar,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateLeadSource } from "./actions";
import { WorkspaceForm } from "./workspace-form";
import { requireFounder } from "@/lib/role-access";
export default async function SettingsPage() {
  const { workspace: accessWorkspace } = await requireFounder();
  const workspace = await prisma.workspace.findUnique({
    where: { id: accessWorkspace.id },
    include: {
      leadSources: { orderBy: { name: "asc" } },
      auditLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      emailAccounts: { orderBy: { createdAt: "desc" } },
      _count: { select: { users: true, auditLogs: true } },
    },
  });
  if (!workspace)
    return <div className="empty-state">Workspace is not configured.</div>;
  const googleAccount = workspace.emailAccounts.find(
    (item) => item.provider === "google" && item.active,
  );
  const microsoftAccount = workspace.emailAccounts.find(
    (item) => item.provider === "microsoft" && item.active,
  );
  return (
    <>
      <div className="list-heading settings-heading">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Settings</h1>
          <p>Workspace, sources, integrations, security and data controls</p>
        </div>
      </div>
      <div className="settings-layout">
        <aside className="settings-nav">
          <a className="active" href="#workspace">
            <Database size={15} />
            Workspace
          </a>
          <a href="#lead-sources">
            <Radar size={15} />
            Lead sources
          </a>
          <a href="#connections">
            <Mail size={15} />
            Email & calendar
          </a>
          <Link href="/team">
            <UsersRound size={15} />
            Team & permissions
          </Link>
          <a href="#security">
            <ShieldCheck size={15} />
            Privacy & security
          </a>
          <a href="#audit-log">
            <Activity size={15} />
            Audit log
          </a>
        </aside>
        <div className="settings-content">
          <section className="settings-card" id="workspace">
            <header>
              <div>
                <h2>Workspace</h2>
                <p>Basic defaults used across Thrive OS.</p>
              </div>
              <span className="configured">
                <Check size={12} />
                Configured
              </span>
            </header>
            <WorkspaceForm workspace={workspace} />
          </section>
          <section className="settings-card" id="lead-sources">
            <header>
              <div>
                <h2>Lead sources</h2>
                <p>
                  Only approved sources may collect public business requests.
                </p>
              </div>
            </header>
            <div className="source-list">
              {workspace.leadSources.map((source) => (
                <div className="source-row" key={source.id}>
                  <span className="source-icon">
                    {source.key === "webtrh" ? (
                      <Radar />
                    ) : source.key === "email" ? (
                      <Mail />
                    ) : (
                      <Database />
                    )}
                  </span>
                  <div className="source-copy">
                    <strong>{source.name}</strong>
                    <small>
                      {source.method.replaceAll("_", " ")}{" "}
                      {source.sourceUrl && (
                        <>
                          ·{" "}
                          <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            source <ExternalLink size={9} />
                          </a>
                        </>
                      )}
                    </small>
                    <p>{source.legalNotes}</p>
                  </div>
                  <form action={updateLeadSource}>
                    {source.key === "webtrh" && !source.active && (
                      <label className="approval-check">
                        <input name="approval" type="checkbox" required />I
                        confirm source approval
                      </label>
                    )}
                    <input type="hidden" name="sourceId" value={source.id} />
                    <input
                      type="hidden"
                      name="enable"
                      value={source.active ? "false" : "true"}
                    />
                    <button className={source.active ? "disable" : ""}>
                      {source.active ? "Disable" : "Enable"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
          <section className="settings-card" id="connections">
            <header>
              <div>
                <h2>Email and calendar</h2>
                <p>
                  Provider adapters are prepared; OAuth credentials are required
                  to connect live accounts.
                </p>
              </div>
            </header>
            <div className="integration-grid">
              <Integration
                icon={<Mail />}
                name="Google Workspace"
                detail="Gmail and Google Calendar"
                provider="google"
                account={googleAccount}
                configured={Boolean(
                  process.env.GOOGLE_OAUTH_CLIENT_ID &&
                  process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
                  process.env.INTEGRATION_ENCRYPTION_KEY,
                )}
              />
              <Integration
                icon={<Mail />}
                name="Microsoft 365"
                detail="Outlook and Microsoft Calendar"
                provider="microsoft"
                account={microsoftAccount}
                configured={Boolean(
                  process.env.MICROSOFT_OAUTH_CLIENT_ID &&
                  process.env.MICROSOFT_OAUTH_CLIENT_SECRET &&
                  process.env.INTEGRATION_ENCRYPTION_KEY,
                )}
              />
              <Integration
                icon={<KeyRound />}
                name="IMAP / SMTP"
                detail="Generic company mailbox"
                configured={false}
              />
            </div>
          </section>
          <section className="settings-card" id="security">
            <header>
              <div>
                <h2>Installation and security</h2>
                <p>
                  Thrive OS is ready as an installable PWA after HTTPS
                  deployment.
                </p>
              </div>
            </header>
            <div className="security-grid">
              <div>
                <Smartphone />
                <span>
                  <strong>Mobile & desktop</strong>
                  <small>iOS, Android, macOS and Windows</small>
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  <strong>Protected workspace</strong>
                  <small>
                    {workspace._count.users} users · capability permissions
                  </small>
                </span>
              </div>
              <div>
                <Activity />
                <span>
                  <strong>Audit history</strong>
                  <small>{workspace._count.auditLogs} immutable events</small>
                </span>
              </div>
            </div>
          </section>
          <section className="settings-card" id="audit-log">
            <header>
              <div>
                <h2>Audit log</h2>
                <p>Latest saved changes and security-relevant actions.</p>
              </div>
              <span className="configured">
                {workspace._count.auditLogs} events
              </span>
            </header>
            <div className="audit-list">
              {workspace.auditLogs.length ? (
                workspace.auditLogs.map((event) => (
                  <div className="audit-row" key={event.id}>
                    <span>
                      <Activity size={14} />
                    </span>
                    <div>
                      <strong>{event.action.replaceAll(".", " ")}</strong>
                      <small>
                        {event.user?.name ?? "System"} · {event.recordType}
                      </small>
                    </div>
                    <time>
                      {event.createdAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))
              ) : (
                <div className="inline-empty">No audit events yet.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
function Integration({
  icon,
  name,
  detail,
  provider,
  account,
  configured,
}: {
  icon: React.ReactNode;
  name: string;
  detail: string;
  provider?: "google" | "microsoft";
  account?: {
    id: string;
    address: string;
    syncStatus: string;
    lastSyncedAt: Date | null;
  };
  configured: boolean;
}) {
  return (
    <div className="integration-item">
      <span>{icon}</span>
      <div>
        <strong>{name}</strong>
        <small>{detail}</small>
      </div>
      {account ? (
        <div className="integration-connected">
          <b className="configured">Connected · {account.address}</b>
          <small>
            {account.lastSyncedAt
              ? `Last sync ${account.lastSyncedAt.toLocaleString("en-GB")}`
              : "Ready for first secure sync"}
          </small>
          <span>
            {provider === "google" && (
              <form
                method="post"
                action={`/api/integrations/accounts/${account.id}/sync`}
              >
                <button>Sync now</button>
              </form>
            )}
            <form
              method="post"
              action={`/api/integrations/accounts/${account.id}/disconnect`}
            >
              <button className="disable">Disconnect</button>
            </form>
          </span>
        </div>
      ) : provider && configured ? (
        <Link href={`/api/integrations/${provider}/connect`}>Connect</Link>
      ) : (
        <b>{provider ? "OAuth credentials required" : "Coming later"}</b>
      )}
    </div>
  );
}
