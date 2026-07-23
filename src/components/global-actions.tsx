"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  CalendarPlus,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";

type Result = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
  }, [open]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { results?: Result[] };
        setResults(data.results ?? []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <>
      <button
        type="button"
        className="global-search"
        onClick={() => setOpen(true)}
      >
        <Search size={17} />
        <span>Search CRM or ask Thrive AI…</span>
        <kbd>⌘ K</kbd>
      </button>
      {open && (
        <div
          className="command-layer"
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
        >
          <button
            className="command-scrim"
            onClick={() => setOpen(false)}
            aria-label="Close search"
          />
          <section className="command-panel">
            <header>
              <Search size={18} />
              <input
                ref={input}
                value={query}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuery(value);
                  if (value.trim().length < 2) {
                    setLoading(false);
                    setResults([]);
                  }
                }}
                placeholder="Search CRM or ask Thrive AI…"
              />
              <button onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="command-results">
              {loading ? (
                <div className="command-empty">
                  <LoaderCircle className="spin" />
                  Searching…
                </div>
              ) : query.length < 2 ? (
                <div className="command-empty">Type at least 2 characters</div>
              ) : (
                <>
                  <button
                    className="command-ai-result"
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("thrive:copilot", {
                          detail: { message: query },
                        }),
                      );
                      setOpen(false);
                    }}
                  >
                    <span>
                      <Sparkles />
                    </span>
                    <div>
                      <strong>Ask Thrive AI</strong>
                      <small>Natural-language CRM search · “{query}”</small>
                    </div>
                  </button>
                  {results.length ? (
                    results.map((result) => (
                      <Link
                        href={result.href}
                        onClick={() => setOpen(false)}
                        key={`${result.type}-${result.id}`}
                      >
                        <span>
                          {result.type === "Company" ? (
                            <Building2 />
                          ) : (
                            <Search />
                          )}
                        </span>
                        <div>
                          <strong>{result.title}</strong>
                          <small>
                            {result.type} · {result.subtitle}
                          </small>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="command-empty">No exact CRM records</div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  useClosePopover(open, setOpen, popoverRef);
  return (
    <div className="action-popover" ref={popoverRef}>
      <button
        type="button"
        className="quick-button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Plus size={17} />
        <span>Quick add</span>
      </button>
      {open && (
        <div className="quick-menu">
          <strong>Create new</strong>
          <Link href="/companies/new" onClick={() => setOpen(false)}>
            <Building2 />
            Company
          </Link>
          <Link href="/deals?new=1" onClick={() => setOpen(false)}>
            <Plus />
            Deal
          </Link>
          <Link href="/calendar?new=1" onClick={() => setOpen(false)}>
            <CalendarPlus />
            Event
          </Link>
          <Link href="/tasks?new=1" onClick={() => setOpen(false)}>
            <Plus />
            Task
          </Link>
        </div>
      )}
    </div>
  );
}

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  useClosePopover(open, setOpen, popoverRef);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (!response.ok) return;
        const data = await response.json() as { unread: number; notifications: NotificationItem[] };
        if (active) {
          setItems(data.notifications);
          setUnread(data.unread);
        }
      } catch {}
    };
    void load();
    return () => { active = false; };
  }, [open]);

  const markRead = async () => {
    await fetch("/api/notifications", { method: "POST" });
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  };
  return (
    <div className="action-popover" ref={popoverRef}>
      <button
        type="button"
        className={`icon-button ${unread ? "has-dot" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
      </button>
      {open && (
        <div className="notification-menu">
          <header>
            <strong>Notifications</strong>
            {unread ? <button type="button" onClick={markRead}>Mark all read</button> : <span>Up to date</span>}
          </header>
          {items.length ? items.map((item) => (
            <Link href={notificationHref(item.type)} onClick={() => setOpen(false)} key={item.id}>
              <i className={item.read ? "read" : ""} />
              <div>
                <strong>{item.title}</strong>
                <small>{item.body ?? formatNotificationDate(item.createdAt)}</small>
              </div>
            </Link>
          )) : <div className="notification-empty">No notifications yet.</div>}
        </div>
      )}
    </div>
  );
}

function notificationHref(type: string) {
  if (type === "MENTION") return "/companies";
  if (type.includes("LEAD")) return "/lead-radar";
  if (type.includes("EMAIL")) return "/inbox";
  return "/tasks";
}

function formatNotificationDate(value: string) {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function useClosePopover(
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
  ref: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open, ref, setOpen]);
}
