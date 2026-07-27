"use client";

import { Cable, Radar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsNav({ founder }: { founder: boolean }) {
  const pathname = usePathname();
  const items = [
    ["Connections", "/settings/connections", Cable],
    ...(founder
      ? ([["Lead sources", "/settings/sources", Radar]] as const)
      : []),
  ] as const;

  return (
    <aside className="settings-nav" aria-label="Settings">
      {items.map(([label, href, Icon]) => (
        <Link
          key={href}
          href={href}
          className={pathname === href ? "active" : ""}
        >
          <Icon size={15} /> {label}
        </Link>
      ))}
    </aside>
  );
}
