"use client";

import { Activity, Radar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Lead sources", "/settings/sources", Radar],
  ["Audit log", "/settings/audit", Activity],
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <aside className="settings-nav" aria-label="Settings">
      {items.map(([label, href, Icon]) => (
        <Link
          key={href}
          className={
            pathname === href || pathname.startsWith(`${href}/`)
              ? "active"
              : ""
          }
          href={href}
        >
          <Icon size={15} />
          {label}
        </Link>
      ))}
    </aside>
  );
}
