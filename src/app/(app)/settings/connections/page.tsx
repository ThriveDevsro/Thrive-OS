import Image from "next/image";
import {
  CheckCircle2,
  LockKeyhole,
  Mail,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { getAccessContext } from "@/lib/role-access";
import { prisma } from "@/lib/prisma";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connection?: string; imported?: string }>;
}) {
  const { connection, imported } = await searchParams;
  const { workspace, user } = await getAccessContext();
  const account = await prisma.emailAccount.findFirst({
    where: {
      workspaceId: workspace.id,
      userId: user.id,
      provider: "google",
      active: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const configured = Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.INTEGRATION_ENCRYPTION_KEY,
  );
  return (
    <div className="connection-page">
      <header>
        <span>
          <Mail />
        </span>
        <div>
          <h1>Connect Gmail</h1>
          <p>
            Automatically log work conversations with existing CRM contacts.
          </p>
        </div>
      </header>
      {connection === "synced" && (
        <div className="connection-notice success">
          <CheckCircle2 /> Sync completed
          {imported ? ` · ${imported} messages processed` : ""}
        </div>
      )}
      {connection?.includes("failed") && (
        <div className="connection-notice error">
          Connection or sync failed. Try reconnecting the account.
        </div>
      )}
      <section className="connection-card">
        <div className="connection-provider">
          <span className="gmail-mark">
            <Image src="/gmail-logo.svg" alt="Gmail" width={30} height={30} />
          </span>
          <div>
            <strong>Google Gmail</strong>
            <small>
              {account ? account.address : "No Gmail account connected"}
            </small>
          </div>
          {account && (
            <b>
              <CheckCircle2 /> Connected
            </b>
          )}
        </div>
        {account ? (
          <>
            <dl className="connection-status">
              <div>
                <dt>Sync mode</dt>
                <dd>Known CRM contacts only</dd>
              </div>
              <div>
                <dt>History</dt>
                <dd>Last {account.syncWindowDays} days</dd>
              </div>
              <div>
                <dt>Last sync</dt>
                <dd>
                  {account.lastSyncedAt?.toLocaleString("en-GB") ??
                    "Not synced yet"}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{account.syncStatus.toLowerCase()}</dd>
              </div>
            </dl>
            <div className="connection-actions">
              <form
                method="post"
                action={`/api/integrations/accounts/${account.id}/sync`}
              >
                <button>
                  <RefreshCw /> Sync now
                </button>
              </form>
              <form
                method="post"
                action={`/api/integrations/accounts/${account.id}/disconnect`}
              >
                <button className="secondary">
                  <Unplug /> Disconnect
                </button>
              </form>
            </div>
          </>
        ) : configured ? (
          <a
            className="google-connect-button"
            href="/api/integrations/google/connect"
          >
            <Image src="/google-logo.svg" alt="" width={18} height={18} />
            Continue with Google
          </a>
        ) : (
          <div className="connection-admin-required">
            <LockKeyhole />
            <div>
              <strong>Administrator setup required once</strong>
              <p>
                Google OAuth credentials must first be added to the Thrive OS
                server. Employees will not need to enter them.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
