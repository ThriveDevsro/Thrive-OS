import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "./src/lib/prisma";

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
        const expectedEmail = process.env.DEMO_FOUNDER_EMAIL;
        const expectedPassword = process.env.DEMO_FOUNDER_PASSWORD;
        if (expectedEmail && expectedPassword && parsed.data.email.toLowerCase() === expectedEmail.toLowerCase() && parsed.data.password === expectedPassword) return { id: "bootstrap-founder", email: expectedEmail, name: "Patrik Korec", role: "founder" };
        const user = await prisma.user.findFirst({ where: { email: parsed.data.email.toLowerCase(), status: "ACTIVE" }, include: { roles: { include: { role: true } } } });
        if (!user?.passwordHash || !await compare(parsed.data.password, user.passwordHash)) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.roles.some(item => item.role.key === "founder") ? "founder" : "salesperson" };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) { if (user?.role) token.role = user.role; token.role ??= "salesperson"; token.workspace = "Thrive Dev"; return token; },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "bootstrap-founder";
        session.user.role = token.role === "salesperson" ? "salesperson" : "founder";
        session.user.workspace = typeof token.workspace === "string" ? token.workspace : "Thrive Dev";
      }
      return session;
    },
  },
});
