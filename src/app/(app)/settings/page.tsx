import { Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/role-access";
import { WorkspaceForm } from "./workspace-form";

export default async function SettingsPage() {
  const { workspace: accessWorkspace } = await requireFounder();
  const workspace = await prisma.workspace.findUnique({
    where: { id: accessWorkspace.id },
  });
  if (!workspace)
    return <div className="empty-state">Workspace is not configured.</div>;

  return (
    <section className="settings-card">
      <header>
        <div>
          <h2>Workspace defaults</h2>
          <p>Core values used when Thrive OS creates new records.</p>
        </div>
        <span className="configured">
          <Check size={12} /> Configured
        </span>
      </header>
      <WorkspaceForm
        key={`${workspace.name}:${workspace.timezone}:${workspace.currency}`}
        workspace={workspace}
      />
    </section>
  );
}
