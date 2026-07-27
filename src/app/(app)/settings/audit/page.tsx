import { Activity, ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/role-access";

const sources = [
  "MANUAL",
  "AUTOMATION",
  "API",
  "EMAIL_SYNC",
  "AI",
  "SYSTEM",
] as const;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; page?: string }>;
}) {
  const { workspace } = await requireFounder();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const source = sources.find((item) => item === params.source) ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const take = 25;
  const where = {
    workspaceId: workspace.id,
    ...(source ? { source } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" as const } },
            { recordType: { contains: q, mode: "insensitive" as const } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  const query = new URLSearchParams({ q, source });

  return (
    <section className="settings-card audit-card">
      <header>
        <div>
          <h2>Audit log</h2>
          <p>Searchable history of saved changes and security-relevant actions.</p>
        </div>
        <span className="audit-total">{total} events</span>
      </header>
      <form className="audit-toolbar">
        <div>
          <Search size={15} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search action, record or person"
          />
        </div>
        <select name="source" defaultValue={source}>
          <option value="">All sources</option>
          {sources.map((item) => (
            <option key={item} value={item}>
              {item.toLowerCase().replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button><Filter size={14} /> Filter</button>
      </form>
      {events.length ? (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Record</th>
                <th>Source</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <Activity size={13} />
                    <strong>{event.action.replaceAll(".", " ")}</strong>
                  </td>
                  <td>{event.user?.name ?? "System"}</td>
                  <td>{event.recordType}</td>
                  <td><span>{event.source.toLowerCase().replaceAll("_", " ")}</span></td>
                  <td>
                    <time dateTime={event.createdAt.toISOString()}>
                      {event.createdAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="inline-empty audit-empty">No events match these filters.</div>
      )}
      <footer className="audit-pagination">
        <span>Page {Math.min(page, pages)} of {pages}</span>
        <div>
          <Link
            aria-disabled={page <= 1}
            href={`/settings/audit?${query.toString()}&page=${Math.max(1, page - 1)}`}
          >
            <ChevronLeft size={15} />
          </Link>
          <Link
            aria-disabled={page >= pages}
            href={`/settings/audit?${query.toString()}&page=${Math.min(pages, page + 1)}`}
          >
            <ChevronRight size={15} />
          </Link>
        </div>
      </footer>
    </section>
  );
}
