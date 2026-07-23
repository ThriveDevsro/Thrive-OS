import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma";

export async function getAccessContext() {
  const session = await auth();
  if (!session?.user?.workspaceId) redirect("/login");
  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      workspaceId: session.user.workspaceId,
      status: "ACTIVE",
    },
    include: { workspace: true, roles: { include: { role: true } } },
  });
  if (!user) redirect("/login");
  const founder = user.roles.some(({ role }) => role.key === "founder");
  return { session, workspace: user.workspace, user, founder };
}

export async function requireFounder() {
  const context = await getAccessContext();
  if (!context.founder) redirect("/dashboard");
  return context;
}
