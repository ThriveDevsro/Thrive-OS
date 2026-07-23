import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { capabilities, capabilitiesFor } from "@/lib/permissions";

export type BootstrapCredentials = {
  email: string;
  password: string;
};

export function getBootstrapCredentials(): BootstrapCredentials | null {
  const email =
    process.env.BOOTSTRAP_ADMIN_EMAIL ?? process.env.DEMO_FOUNDER_EMAIL;
  const password =
    process.env.BOOTSTRAP_ADMIN_PASSWORD ??
    process.env.DEMO_FOUNDER_PASSWORD;

  if (!email || !password) return null;
  return { email: email.trim().toLowerCase(), password };
}

export function matchesBootstrapCredentials(
  supplied: BootstrapCredentials,
  configured = getBootstrapCredentials(),
): boolean {
  return Boolean(
    configured &&
      supplied.email.trim().toLowerCase() === configured.email &&
      supplied.password === configured.password,
  );
}

export async function ensureInitialAdmin(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hash(input.password, 12);
  const configuredSlug = process.env.BOOTSTRAP_WORKSPACE_SLUG ?? "thrive-dev";
  const configuredName = process.env.BOOTSTRAP_WORKSPACE_NAME ?? "Thrive Dev";

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findFirst({
      where: { email },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    const workspace =
      existingUser?.workspace ??
      (await tx.workspace.upsert({
        where: { slug: configuredSlug },
        update: {},
        create: { slug: configuredSlug, name: configuredName },
      }));

    for (const key of capabilities) {
      await tx.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key.replaceAll(".", " ") },
      });
    }

    const founder = await tx.role.upsert({
      where: {
        workspaceId_key: { workspaceId: workspace.id, key: "founder" },
      },
      update: { system: true },
      create: {
        workspaceId: workspace.id,
        key: "founder",
        name: "Founder / Super Admin",
        description:
          "Full company access, team administration, settings, automations and audit history.",
        system: true,
      },
    });
    await tx.role.upsert({
      where: {
        workspaceId_key: { workspaceId: workspace.id, key: "salesperson" },
      },
      update: { system: true },
      create: {
        workspaceId: workspace.id,
        key: "salesperson",
        name: "Salesperson",
        description:
          "Access to assigned leads, owned companies and deals, personal tasks, shared inbox and calendar.",
        system: true,
      },
    });

    const permissions = await tx.permission.findMany({
      where: { key: { in: [...capabilitiesFor("founder")] } },
      select: { id: true },
    });
    await tx.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: founder.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });

    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            status: "ACTIVE",
            ...(!existingUser.passwordHash ? { passwordHash } : {}),
          },
        })
      : await tx.user.create({
          data: {
            workspaceId: workspace.id,
            email,
            name: input.name?.trim() || "Workspace owner",
            passwordHash,
            status: "ACTIVE",
          },
        });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: founder.id } },
      update: {},
      create: { userId: user.id, roleId: founder.id },
    });

    return { user, workspace, role: "founder" as const };
  });
}
