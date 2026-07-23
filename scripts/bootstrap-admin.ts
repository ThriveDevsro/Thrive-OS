import "dotenv/config";
import {
  ensureInitialAdmin,
  getBootstrapCredentials,
} from "../src/lib/auth/bootstrap-admin";
import { prisma } from "../src/lib/prisma";

async function main() {
  const credentials = getBootstrapCredentials();
  if (!credentials) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD before running this script.",
    );
  }

  const result = await ensureInitialAdmin({
    ...credentials,
    name: process.env.BOOTSTRAP_ADMIN_NAME ?? "Patrik Korec",
  });
  const userCount = await prisma.user.count({
    where: { workspaceId: result.workspace.id },
  });

  console.log(
    `Bootstrap complete: ${result.user.email} is ${result.role} in ${result.workspace.slug}. Workspace users: ${userCount}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
