import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "./src/lib/prisma";
import {
  ensureInitialAdmin,
  getBootstrapCredentials,
  matchesBootstrapCredentials,
} from "./src/lib/auth/bootstrap-admin";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Thrive Dev work account",
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentials.safeParse(raw);
        if (!parsed.success) return null;
        const bootstrap = getBootstrapCredentials();
        if (matchesBootstrapCredentials(parsed.data, bootstrap)) {
          const { user, workspace } = await ensureInitialAdmin({
            email: bootstrap!.email,
            password: bootstrap!.password,
            name: process.env.BOOTSTRAP_ADMIN_NAME ?? "Patrik Korec",
          });
          return { id: user.id, email: user.email, name: user.name, role: "founder", workspaceId: workspace.id, workspace: workspace.name };
        }
        const user = await prisma.user.findFirst({ where: { email: parsed.data.email.toLowerCase(), status: "ACTIVE" }, include: { workspace: true, roles: { include: { role: true } } } });
        if (!user?.passwordHash || !await compare(parsed.data.password, user.passwordHash)) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.roles.some(item => item.role.key === "founder") ? "founder" : "salesperson", workspaceId: user.workspaceId, workspace: user.workspace.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) token.role = user.role;
      if (user?.workspaceId) token.workspaceId = user.workspaceId;
      if (user?.workspace) token.workspace = user.workspace;
      if (!user && token.email && !token.workspaceId) {
        const stored = await prisma.user.findFirst({
          where: { email: token.email, status: "ACTIVE" },
          include: { workspace: true, roles: { include: { role: true } } },
        });
        if (stored) {
          token.sub = stored.id;
          token.workspaceId = stored.workspaceId;
          token.workspace = stored.workspace.name;
          token.role = stored.roles.some(({ role }) => role.key === "founder")
            ? "founder"
            : "salesperson";
        }
      }
      token.role ??= "salesperson";
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role === "salesperson" ? "salesperson" : "founder";
        session.user.workspaceId = typeof token.workspaceId === "string" ? token.workspaceId : "";
        session.user.workspace = typeof token.workspace === "string" ? token.workspace : "";
      }
      return session;
    },
  },
});
