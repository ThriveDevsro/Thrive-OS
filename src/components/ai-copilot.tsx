"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AtSign,
  ArrowRight,
  Check,
  FileText,
  ImageIcon,
  LoaderCircle,
  MessageSquarePlus,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type SearchResult = {
  entityType: string;
  entityId: string;
  title: string;
  reason: string;
  href: string;
};
type Action = {
  id: string;
  tool: string;
  status: string;
  preview: {
    title?: string;
    description?: string;
    amount?: number | null;
    currency?: string | null;
    dueInDays?: number | null;
  };
};
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  results?: SearchResult[];
  actions?: Action[];
  attachment?: string;
  attachmentPreview?: string;
  attachmentType?: string;
};
type MentionResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
};

const starters = [
  "Ktoré leady mám riešiť ako prvé?",
  "Ukáž rizikové otvorené dealy",
  "Navrhni dnešné follow-upy",
  "Zhrň stav pipeline",
];

export function AiCopilot({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [mentionResults, setMentionResults] = useState<MentionResult[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const mention = message.match(/(?:^|\s)@([^@\s]*)$/)?.[1] ?? null;

  function newChat() {
    setConversationId(undefined);
    setMessages([]);
    setMessage("");
    setAttachment(null);
    setAttachmentPreview("");
    setMentionResults([]);
    setError("");
  }

  function selectAttachment(file: File | null) {
    setAttachment(file);
    setAttachmentPreview("");
    if (file?.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setAttachmentPreview(String(reader.result ?? ""));
      reader.readAsDataURL(file);
    }
  }

  useEffect(() => {
    const openFromSearch = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setOpen(true);
      setMessage(detail?.message ?? "");
    };
    window.addEventListener("thrive:copilot", openFromSearch);
    return () => window.removeEventListener("thrive:copilot", openFromSearch);
  }, []);

  useEffect(() => {
    if (mention === null) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (mention.length < 2) return setMentionResults([]);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(mention)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          results?: MentionResult[];
        };
        setMentionResults(payload.results ?? []);
      } catch {
        if (!controller.signal.aborted) setMentionResults([]);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mention]);

  async function submit(event?: FormEvent, starter?: string) {
    event?.preventDefault();
    const text = (starter ?? message).trim();
    if (!text || busy || !enabled) return;
    setMessage("");
    setError("");
    setMessages((items) => [
      ...items,
      {
        role: "user",
        content: text,
        attachment: attachment?.name,
        attachmentPreview,
        attachmentType: attachment?.type,
      },
    ]);
    setBusy(true);
    try {
      const form = new FormData();
      form.set("message", text);
      if (conversationId) form.set("conversationId", conversationId);
      const context = pageContext(pathname, searchParams.get("thread"));
      if (context.contextType) form.set("contextType", context.contextType);
      if (context.contextId) form.set("contextId", context.contextId);
      if (attachment) form.set("attachment", attachment);
      const response = await fetch("/api/ai/copilot", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success)
        throw new Error(payload.error?.code ?? "AI_PROVIDER_UNAVAILABLE");
      setConversationId(payload.conversationId);
      setAttachment(null);
      setAttachmentPreview("");
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          content: payload.message.content,
          results: payload.searchResults,
          actions: payload.actions,
        },
      ]);
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "";
      setError(
        code === "AI_RATE_LIMITED"
          ? "Denný AI limit bol vyčerpaný."
          : code === "AI_DISABLED"
            ? "Thrive AI zatiaľ nie je zapnutá."
            : code === "AI_INPUT_TOO_LARGE"
              ? "Príloha je príliš veľká. Text môže mať 250 KB, obrázok 5 MB."
              : code === "AI_CONFIG_INVALID"
                ? "Nepodporovaný alebo poškodený súbor. Použi PNG, JPEG, WebP, TXT, CSV, MD alebo JSON."
              : "Thrive AI momentálne nevie odpovedať. Skús to znova.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm(actionId: string) {
    setError("");
    const response = await fetch(`/api/ai/actions/${actionId}/confirm`, {
      method: "POST",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError("Návrh sa nepodarilo potvrdiť.");
      return;
    }
    setMessages((items) =>
      items.map((item) => ({
        ...item,
        actions: item.actions?.map((action) =>
          action.id === actionId ? { ...action, status: "CONFIRMED" } : action,
        ),
      })),
    );
  }

  return (
    <>
      <button
        type="button"
        className="copilot-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open Thrive AI"
      >
        <Sparkles size={17} />
        <span>Thrive AI</span>
      </button>
      {open && (
        <div className="copilot-layer">
          <button
            className="copilot-scrim"
            aria-label="Close Thrive AI"
            onClick={() => setOpen(false)}
          />
          <aside className="copilot-panel" aria-label="Thrive AI">
            <header>
              <div>
                <strong>Thrive AI</strong>
                <small>Ask, analyze and prepare CRM work</small>
              </div>
              <button className="copilot-new-chat" type="button" onClick={newChat}>
                <MessageSquarePlus /> <span>New chat</span>
              </button>
              <button className="copilot-close" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </button>
            </header>
            <div className="copilot-stream">
              {!enabled ? (
                <div className="copilot-welcome">
                  <Sparkles />
                  <h2>Thrive AI je pripravená</h2>
                  <p>
                    Founder musí najprv nastaviť Gemini kľúč a zapnúť AI v
                    serverovom prostredí.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="copilot-welcome">
                  <Sparkles />
                  <h2>Čo chceš dnes vyriešiť?</h2>
                  <p>
                    Pýtaj sa na leady, firmy, pipeline alebo inbox.
                    Thrive AI pripraví návrhy, nič nevykoná bez potvrdenia.
                  </p>
                  <div>
                    {starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => void submit(undefined, starter)}
                      >
                        {starter}
                        <ArrowRight />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((item, index) => (
                  <article
                    className={`copilot-message ${item.role}`}
                    key={`${item.role}-${index}`}
                  >
                    {item.role === "assistant" && (
                      <span>
                        <Sparkles />
                      </span>
                    )}
                    <div>
                      {item.role === "assistant" ? <FormattedAnswer content={item.content} /> : <p>{item.content}</p>}
                      {item.attachment && (
                        <small className="copilot-message-file">
                          {item.attachmentPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.attachmentPreview} alt="" />
                          ) : item.attachmentType?.startsWith("image/") ? <ImageIcon /> : <FileText />}
                          {item.attachment}
                        </small>
                      )}
                      {item.results?.length ? (
                        <section className="copilot-results">
                          <strong>
                            <Search /> Relevantné záznamy
                          </strong>
                          {item.results.map((result) => (
                            <Link href={result.href} key={result.entityId}>
                              <span>{result.entityType}</span>
                              <div>
                                <b>{result.title}</b>
                                <small>{result.reason}</small>
                              </div>
                              <ArrowRight />
                            </Link>
                          ))}
                        </section>
                      ) : null}
                      {item.actions?.length ? (
                        <section className="copilot-actions">
                          <strong>Návrhy na potvrdenie</strong>
                          {item.actions.map((action) => (
                            <div key={action.id}>
                              <span>{label(action.tool)}</span>
                              <b>{action.preview.title ?? "AI suggestion"}</b>
                              <p>{action.preview.description}</p>
                              {action.status === "CONFIRMED" ? (
                                action.tool === "DRAFT_EMAIL" ? (
                                  <Link href={`/inbox?draft=${action.id}`}>
                                    <Check /> Otvoriť draft v Inboxe
                                  </Link>
                                ) : (
                                  <em>
                                    <Check /> Potvrdené
                                  </em>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void confirm(action.id)}
                                >
                                  Skontrolovať a potvrdiť
                                </button>
                              )}
                            </div>
                          ))}
                        </section>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
              {busy && (
                <div className="copilot-thinking">
                  <LoaderCircle /> Analyzujem CRM…
                </div>
              )}
              {error && <p className="copilot-error">{error}</p>}
            </div>
            <form onSubmit={(event) => void submit(event)}>
              {mention !== null && mentionResults.length > 0 && (
                <div className="copilot-mentions">
                  {mentionResults.slice(0, 6).map((result) => (
                    <button
                      type="button"
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        setMessage((value) =>
                          value.replace(
                            /@[^@\s]*$/,
                            `@[${result.title}](${result.type.toLowerCase()}:${result.id}) `,
                          ),
                        );
                        setMentionResults([]);
                      }}
                    >
                      <AtSign />
                      <span>
                        <b>{result.title}</b>
                        <small>
                          {result.type} · {result.subtitle}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {attachment && (
                <div className="copilot-attachment">
                  {attachmentPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={attachmentPreview} alt="Attachment preview" />
                  ) : <FileText />}
                  <span>{attachment.name}</span>
                  <small>{Math.ceil(attachment.size / 1024)} KB</small>
                  <button type="button" onClick={() => selectAttachment(null)}>
                    <Trash2 />
                  </button>
                </div>
              )}
              <div className="copilot-composer">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={enabled ? "Ask Thrive AI anything about your CRM…" : "AI je vypnutá"}
                  disabled={!enabled || busy}
                  rows={3}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                />
                <div className="copilot-composer-toolbar">
                  <div>
                    <button type="button" title="Mention CRM record" onClick={() => setMessage((value) => `${value}${value ? " " : ""}@`)}>
                      <AtSign /><span>CRM</span>
                    </button>
                    <button type="button" title="Attach file or image" onClick={() => fileInput.current?.click()}>
                      <Paperclip /><span>Attach</span>
                    </button>
                  </div>
                  <button className="copilot-send" disabled={!enabled || busy || !message.trim()} aria-label="Send">
                    <Send />
                  </button>
                </div>
                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept=".txt,.csv,.md,.json,.png,.jpg,.jpeg,.webp,text/plain,text/csv,text/markdown,application/json,image/png,image/jpeg,image/webp"
                  onChange={(event) => selectAttachment(event.target.files?.[0] ?? null)}
                />
              </div>
              <small>AI môže robiť chyby. Každú CRM akciu skontroluj.</small>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}

function FormattedAnswer({ content }: { content: string }) {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(<ul key={`list-${blocks.length}`}>{bullets.map((line, index) => <li key={index}>{line}</li>)}</ul>);
    bullets = [];
  };
  for (const line of lines) {
    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      bullets.push(line.replace(/^([-*•]|\d+[.)])\s+/, ""));
      continue;
    }
    flushBullets();
    if (/^#{1,3}\s+/.test(line) || (line.length < 70 && line.endsWith(":"))) {
      blocks.push(<h3 key={`heading-${blocks.length}`}>{line.replace(/^#{1,3}\s+/, "").replace(/:$/, "")}</h3>);
    } else {
      blocks.push(<p key={`paragraph-${blocks.length}`}>{line}</p>);
    }
  }
  flushBullets();
  return <div className="copilot-answer">{blocks.length ? blocks : <p>{content}</p>}</div>;
}

function label(tool: string) {
  if (tool === "DRAFT_EMAIL") return "E-mail draft";
  if (tool === "CREATE_DEAL") return "New deal";
  return "Suggested action";
}

function pageContext(pathname: string, thread: string | null) {
  const company = pathname.match(/^\/companies\/([0-9a-f-]{36})$/i)?.[1];
  if (company) return { contextType: "company", contextId: company };
  if (thread && /^[0-9a-f-]{36}$/i.test(thread))
    return { contextType: "thread", contextId: thread };
  return {};
}
