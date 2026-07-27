import { Database, ExternalLink, Mail, Radar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/role-access";
import { updateLeadSource } from "../actions";

export default async function LeadSourcesSettingsPage() {
  const { workspace } = await requireFounder();
  const sources = await prisma.leadSource.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" },
  });

  return (
    <section className="settings-card">
      <header>
        <div>
          <h2>Lead sources</h2>
          <p>Control which approved sources can add requests to Lead Radar.</p>
        </div>
      </header>
      <div className="source-list">
        {sources.map((source) => (
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
                {source.method.replaceAll("_", " ")}
                {source.sourceUrl && (
                  <>
                    {" "}·{" "}
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
                  <input name="approval" type="checkbox" required />
                  I confirm source approval
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
  );
}
