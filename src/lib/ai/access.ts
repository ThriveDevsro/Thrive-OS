import { auth } from "../../../auth";
import { prisma } from "@/lib/prisma";
import type { SystemRole } from "@/lib/permissions";
import { AiError } from "./errors";

export async function getAiAccessContext() {
  const session = await auth();
  if (!session?.user?.email) throw new AiError("AI_PERMISSION_DENIED", 401);
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "thrive-dev" },
    select: { id: true },
  });
  if (!workspace) throw new AiError("AI_PERMISSION_DENIED", 403);
  const user = await prisma.user.findFirst({
    where: {
      workspaceId: workspace.id,
      email: session.user.email,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!user) throw new AiError("AI_PERMISSION_DENIED", 403);
  const role: SystemRole =
    session.user.role === "founder" ? "founder" : "salesperson";
  return { workspaceId: workspace.id, userId: user.id, role };
}
