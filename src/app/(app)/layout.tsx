import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "../../../auth";
import { AppShell } from "@/components/app-shell";
import { isAiEnabled } from "@/lib/ai/config";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
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
