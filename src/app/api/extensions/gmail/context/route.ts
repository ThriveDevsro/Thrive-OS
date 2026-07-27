import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/extensions/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await authenticateExtension(request);
  if (!access) {
    return response({ error: "Unauthorized" }, 401);
  }
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response({ error: "Invalid email" }, 400);
  }
  const contact = await prisma.contact.findFirst({
    where: {
      workspaceId: access.workspaceId,
      email: { equals: email, mode: "insensitive" },
      deletedAt: null,
    },
    include: {
      owner: { select: { name: true } },
      company: {
        include: {
          opportunities: {
            include: { stage: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
          activities: {
            orderBy: { occurredAt: "desc" },
            take: 3,
            select: { title: true, occurredAt: true, type: true },
          },
        },
      },
    },
  });
  if (!contact) return response({ found: false, email });
  const deal = contact.company?.opportunities[0];
  return response({
    found: true,
    contact: {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email,
      jobTitle: contact.jobTitle,
      owner: contact.owner?.name ?? null,
    },
    company: contact.company
      ? {
          id: contact.company.id,
          name: contact.company.name,
          lifecycle: contact.company.lifecycleStatus,
        }
      : null,
    deal: deal
      ? {
          id: deal.id,
          name: deal.name,
          stage: deal.stage.name,
          nextStep: deal.nextStep,
          value: `${(Number(deal.valueMinor) / 100).toLocaleString("en")} ${deal.currency}`,
        }
      : null,
    activities:
      contact.company?.activities.map((activity) => ({
        title: activity.title,
        type: activity.type,
        occurredAt: activity.occurredAt.toISOString(),
      })) ?? [],
  });
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
