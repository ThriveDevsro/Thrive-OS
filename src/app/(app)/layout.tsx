import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { isAiEnabled } from "@/lib/ai/config";
import { getAccessContext } from "@/lib/role-access";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getAccessContext();
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("thrive-sidebar-collapsed")?.value;
  return (
    <AppShell
      userName={session.user.name ?? "Thrive user"}
      userEmail={session.user.email ?? "work account"}
      role={session.user.role}
      aiEnabled={isAiEnabled()}
      initialSidebarCollapsed={
        sidebarCookie === undefined ? null : sidebarCookie === "1"
      }
    >
      {children}
    </AppShell>
  );
}
