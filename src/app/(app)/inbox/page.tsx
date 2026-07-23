import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  Inbox,
  Mail,
  MessageSquareReply,
  Search,
  Send,
  Settings2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ComposeModal } from "./compose-modal";
import { replyToConversation, setConversationStatus } from "./actions";
import { getAccessContext } from "@/lib/role-access";
import { measureServerOperation } from "@/lib/performance";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    thread?: string;
    status?: string;
    q?: string;
    draft?: string;
  }>;
}) {
  const params = await searchParams;
  const { session, workspace } = await getAccessContext();
  const status = params.status === "closed" ? "CLOSED" : "OPEN";
  const q = params.q?.trim() ?? "";
  const draftAction =
    params.draft && session.user.email
      ? await prisma.aIAction.findFirst({
          where: {
            id: params.draft,
            workspaceId: workspace.id,
            user: { email: session.user.email },
            tool: "DRAFT_EMAIL",
            status: "CONFIRMED",
          },
          select: { preview: true },
        })
      : null;
  const draft = draftFromPreview(draftAction?.preview);
  const threads = await measureServerOperation("route:inbox:threads",()=>prisma.emailThread.findMany({
    where: {
      workspaceId: workspace.id,
      status,
      ...(q ? { subject: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  }));
  const messages = threads.length
    ? await prisma.emailMessage.findMany({
        where: {
          workspaceId: workspace.id,
          threadId: { in: threads.map((item) => item.id) },
        },
        orderBy: { sentAt: "asc" },
      })
    : [];
  const grouped = Map.groupBy(messages, (message) => message.threadId);
  const selected =
    threads.find((item) => item.id === params.thread) ?? threads[0];
  const selectedMessages = selected ? (grouped.get(selected.id) ?? []) : [];
  const peer =
    selectedMessages.find((message) => message.sender !== session?.user?.email)
      ?.sender ??
    recipientOf(selectedMessages[0]) ??
    "client@company.com";
  return (
    <>
      <div className="list-heading inbox-heading">
        <div>
          <p className="eyebrow">COMMUNICATION · SHARED INBOX</p>
          <h1>Inbox</h1>
          <p>Customer conversations visible to the whole Thrive team</p>
        </div>
        <ComposeModal draft={draft} />
      </div>
      <div className="inbox-shell">
        <aside className="inbox-sidebar">
          <nav>
            <Link className={status === "OPEN" ? "active" : ""} href="/inbox">
              <Inbox />
              Open <b>{status === "OPEN" ? threads.length : ""}</b>
            </Link>
            <Link
              className={status === "CLOSED" ? "active" : ""}
              href="/inbox?status=closed"
            >
              <Archive />
              Closed
            </Link>
              <Link href="/connections">
              <Settings2 />
              Connect email
            </Link>
          </nav>
          <form className="inbox-search">
            <Search />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search conversations"
            />
            <input type="hidden" name="status" value={status.toLowerCase()} />
          </form>
          <div className="thread-list">
            {threads.length ? (
              threads.map((thread) => {
                const items = grouped.get(thread.id) ?? [];
                const last = items.at(-1);
                return (
                  <Link
                    className={selected?.id === thread.id ? "active" : ""}
                    href={`/inbox?status=${status.toLowerCase()}&thread=${thread.id}`}
                    key={thread.id}
                  >
                    <span className="thread-avatar">
                      {(last?.sender ?? "T")[0].toUpperCase()}
                    </span>
                    <div>
                      <strong>{thread.subject}</strong>
                      <p>{last?.sanitizedBody ?? "No message preview"}</p>
                      <small>{last?.sender ?? "Unknown sender"}</small>
                    </div>
                    <time>
                      {last?.sentAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </time>
                  </Link>
                );
              })
            ) : (
              <div className="inbox-empty-list">
                <Mail />
                <strong>No {status.toLowerCase()} conversations</strong>
                <p>Start one or connect a company mailbox.</p>
              </div>
            )}
          </div>
        </aside>
        <section className="conversation-panel">
          {selected ? (
            <>
              <header>
                <div>
                  <strong>{selected.subject}</strong>
                  <span>{peer}</span>
                </div>
                <form action={setConversationStatus}>
                  <input type="hidden" name="threadId" value={selected.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={selected.status === "OPEN" ? "CLOSED" : "OPEN"}
                  />
                  <button>
                    {selected.status === "OPEN" ? (
                      <>
                        <CheckCircle2 />
                        Close
                      </>
                    ) : (
                      <>
                        <Inbox />
                        Reopen
                      </>
                    )}
                  </button>
                </form>
              </header>
              <div className="message-stream">
                {selectedMessages.map((message) => {
                  const mine = message.sender === session?.user?.email;
                  return (
                    <article
                      className={mine ? "outgoing" : "incoming"}
                      key={message.id}
                    >
                      <header>
                        <span>{message.sender[0].toUpperCase()}</span>
                        <div>
                          <strong>{mine ? "You" : message.sender}</strong>
                          <small>
                            {message.sentAt.toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                        </div>
                      </header>
                      <p>{message.sanitizedBody}</p>
                      <small>
                        {mine
                          ? `To: ${recipientOf(message)}`
                          : "Incoming message"}
                      </small>
                    </article>
                  );
                })}
              </div>
              <form action={replyToConversation} className="reply-box">
                <input type="hidden" name="threadId" value={selected.id} />
                <input type="hidden" name="recipient" value={peer} />
                <textarea
                  name="message"
                  required
                  placeholder="Write a reply…"
                  rows={3}
                />
                <footer>
                  <span>
                    <MessageSquareReply />
                    Replying to {peer}
                  </span>
                  <button>
                    <Send />
                    Add reply
                  </button>
                </footer>
              </form>
            </>
          ) : (
            <div className="conversation-empty">
              <Mail />
              <h2>Your shared inbox is ready</h2>
              <p>
                Start a conversation now. When Gmail or Outlook is connected,
                incoming and outgoing messages will appear here automatically.
              </p>
              <ComposeModal />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function draftFromPreview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const preview = value as Record<string, unknown>;
  if (
    typeof preview.title !== "string" ||
    typeof preview.description !== "string"
  )
    return;
  return { subject: preview.title, message: preview.description };
}

function recipientOf(message: { recipients: unknown } | undefined) {
  if (!message || !Array.isArray(message.recipients)) return null;
  return message.recipients.find((value) => typeof value === "string") as
    string | undefined;
}
