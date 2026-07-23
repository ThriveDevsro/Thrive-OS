import "next-auth";

declare module "next-auth" {
  interface User { role?: "founder" | "salesperson"; workspaceId?: string; workspace?: string }
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: "founder" | "salesperson"; workspaceId: string; workspace: string };
  }
}

declare module "next-auth/jwt" {
  interface JWT { role?: "founder" | "salesperson"; workspaceId?: string; workspace?: string }
}
