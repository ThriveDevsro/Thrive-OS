import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";
import { measureServerOperation } from "@/lib/performance";

const resolveAccessContext = cache(async () => {
  const session = await auth();
  if (!session?.user?.workspaceId) return null;
  const user = await measureServerOperation("access-context", () =>
    prisma.user.findFirst({
      where: {
        id: session.user.id,
        workspaceId: session.user.workspaceId,
        status: "ACTIVE",
      },
      include: { workspace: true, roles: { include: { role: true } } },
    }),
  );
  if (!user) return null;
  const founder = user.roles.some(({ role }) => role.key === "founder");
  return { session, workspace: user.workspace, user, founder };
});

export async function getAccessContext() {
  const context = await resolveAccessContext();
  if (!context) redirect("/login");
  return context;
}

export function getAccessContextOrNull() {
  return resolveAccessContext();
}

export async function requireFounder() {
  const context = await getAccessContext();
  if (!context.founder) redirect("/dashboard");
  return context;
}
