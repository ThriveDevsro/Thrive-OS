import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const workspace = await prisma.workspace.findUnique({ where: { slug: "thrive-dev" } });
  if (!workspace) return NextResponse.json({ results: [] });
  const [companies, leads] = await Promise.all([
    prisma.company.findMany({ where: { workspaceId: workspace.id, deletedAt: null, OR: [{ name: { contains: q, mode: "insensitive" } }, { domain: { contains: q, mode: "insensitive" } }] }, select: { id: true, name: true, domain: true }, take: 8 }),
    prisma.lead.findMany({ where: { workspaceId: workspace.id, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }, select: { id: true, title: true, status: true }, take: 8 }),
  ]);
  return NextResponse.json({ results: [
    ...companies.map(item => ({ id: item.id, type: "Company", title: item.name, subtitle: item.domain ?? "No domain", href: `/companies/${item.id}` })),
    ...leads.map(item => ({ id: item.id, type: "Lead", title: item.title, subtitle: item.status.toLowerCase(), href: `/lead-radar?lead=${item.id}` })),
  ] });
}
