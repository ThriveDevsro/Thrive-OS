"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Inbox,
  ListTodo,
  LogOut,
  Menu,
  Radar,
  Settings,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import {
  GlobalSearch,
  Notifications,
  QuickAdd,
} from "@/components/global-actions";
import { logout } from "@/app/(app)/actions";

const AiCopilot = dynamic(
  () => import("@/components/ai-copilot").then((module) => module.AiCopilot),
  { ssr: false },
);

const nav = [
  ["Dashboard", "/dashboard", CircleGauge],
  ["Lead Radar", "/lead-radar", Radar],
  ["Companies", "/companies", Building2],
  ["Deals", "/deals", BriefcaseBusiness],
  ["Inbox", "/inbox", Inbox],
  ["Tasks", "/tasks", ListTodo],
  ["Calendar", "/calendar", CalendarDays],
  ["Analytics", "/analytics", BarChart3],
  ["Automations", "/automations", Workflow],
  ["Team", "/team", UsersRound],
  ["Settings", "/settings", Settings],
] as const;
const highPriorityRoutes = new Set([
  "/dashboard",
  "/lead-radar",
  "/companies",
  "/deals",
  "/inbox",
  "/tasks",
  "/calendar",
]);

export function AppShell({
  children,
  userName,
  userEmail,
  role,
  aiEnabled,
  initialSidebarCollapsed,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  role: "founder" | "salesperson";
  aiEnabled: boolean;
  initialSidebarCollapsed: boolean | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialSidebarCollapsed ?? false);
  const active = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const visibleNav =
    role === "founder"
      ? nav
      : nav.filter(
          ([label]) => !["Automations", "Team", "Settings"].includes(label),
        );
  const mobilePrimary = visibleNav.filter(([label]) =>
    ["Dashboard", "Lead Radar", "Inbox", "Tasks"].includes(label),
  );
  const mobilePrimaryHrefs = new Set(mobilePrimary.map(([, href]) => href));
  const moreActive = visibleNav.some(
    ([, href]) => !mobilePrimaryHrefs.has(href) && active(href),
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (initialSidebarCollapsed !== null) return;
    const timer = window.setTimeout(() => {
      const migrated =
        window.localStorage.getItem("thrive:sidebar-collapsed") === "true";
      setCollapsed(migrated);
      persistSidebarPreference(migrated);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialSidebarCollapsed]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      persistSidebarPreference(next);
      return next;
    });
  }

  return (
    <div className={`app-frame ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar desktop-sidebar" aria-label="Main navigation">
        <div className="sidebar-head">
          <Link href="/dashboard" className="logo">
            <Image
              src={collapsed ? "/logo.png" : "/thrive-dev-logo.png"}
              alt="Thrive Dev"
              width={collapsed ? 1563 : 717}
              height={collapsed ? 2048 : 197}
              priority
            />
          </Link>
        </div>
        <button
          type="button"
          className="sidebar-collapse"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <nav>
          {visibleNav.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              prefetch={highPriorityRoutes.has(href) ? true : undefined}
              title={collapsed ? label : undefined}
              onClick={() => setOpen(false)}
              className={active(href) ? "active" : ""}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Inbox" && <b>3</b>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="profile">
            <span className="avatar">PK</span>
            <div>
              <strong>{userName}</strong>
              <small>{userEmail}</small>
            </div>
            <form action={logout}>
              <button title="Sign out" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      {open && (
        <div
          className="mobile-drawer-layer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button
            type="button"
            className="mobile-drawer-scrim"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside id="mobile-navigation" className="mobile-drawer">
            <div className="mobile-sheet-handle" />
            <header>
              <div>
                <strong>Menu</strong>
                <small>Everything in Thrive OS</small>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X size={23} />
              </button>
            </header>
            <nav>
              {visibleNav.map(([label, href, Icon]) => (
                <Link
                  key={href}
                  href={href}
                  prefetch={highPriorityRoutes.has(href) ? true : undefined}
                  onClick={() => setOpen(false)}
                  className={active(href) ? "active" : ""}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
            <footer>
              <span className="avatar">PK</span>
              <div>
                <strong>{userName}</strong>
                <small>{userEmail}</small>
              </div>
              <form action={logout}>
                <button aria-label="Sign out">
                  <LogOut size={18} />
                </button>
              </form>
            </footer>
          </aside>
        </div>
      )}
      <section className="main-column">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setOpen(true)}
            aria-controls="mobile-navigation"
            aria-expanded={open}
            aria-label="Open navigation"
          >
            <Menu size={23} />
          </button>
          <GlobalSearch />
          <div className="top-actions">
            <AiCopilot enabled={aiEnabled} />
            <Notifications />
            <QuickAdd />
          </div>
        </header>
        <main className="content">{children}</main>
        <nav className="mobile-dock" aria-label="Mobile navigation">
          {mobilePrimary.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              prefetch
              className={active(href) ? "active" : ""}
            >
              <Icon size={20} />
              <span>{label === "Lead Radar" ? "Leads" : label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open all sections"
            className={moreActive ? "active" : ""}
          >
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>
      </section>
    </div>
  );
}

function persistSidebarPreference(collapsed: boolean) {
  window.localStorage.setItem("thrive:sidebar-collapsed", String(collapsed));
  document.cookie = `thrive-sidebar-collapsed=${collapsed ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
