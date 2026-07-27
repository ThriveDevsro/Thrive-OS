"use client";

import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, MessageSquareReply, Send } from "lucide-react";
import {
  replyToConversation,
  type ReplyState,
} from "./actions";

export function ReplyForm({
  threadId,
  recipient,
}: {
  threadId: string;
  recipient: string;
}) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(
    replyToConversation,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="reply-box">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="recipient" value={recipient} />
      <textarea
        name="message"
        required
        placeholder="Write a reply…"
        rows={3}
      />
      {(state.error || state.ok) && (
        <p className={state.error ? "reply-error" : "reply-success"}>
          {state.error ?? state.ok}
        </p>
      )}
      <footer>
        <span>
          <MessageSquareReply />
          Replying to {recipient}
        </span>
        <button disabled={pending}>
          {pending ? <LoaderCircle className="spin" /> : <Send />}
          {pending ? "Sending…" : "Send reply"}
        </button>
      </footer>
    </form>
  );
}
