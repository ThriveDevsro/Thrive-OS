"use client";

import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";

export function ActivityNoteDialog({
  title,
  body,
  date,
}: {
  title: string;
  body: string;
  date: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <button type="button" className="activity-preview" onClick={() => setOpen(true)}>
        <span><Mail size={14} /></span>
        <div>
          <strong>{title}</strong>
          <p>{body}</p>
          <small>{date}</small>
        </div>
      </button>
      {open && (
        <div className="note-dialog" role="dialog" aria-modal="true" aria-label={title}>
          <button className="note-dialog-scrim" type="button" onClick={() => setOpen(false)} aria-label="Close note" />
          <article>
            <header>
              <div>
                <span>Activity note</span>
                <h2>{title}</h2>
                <time>{date}</time>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={19} /></button>
            </header>
            <div className="note-dialog-body">{body}</div>
            <footer><button type="button" onClick={() => setOpen(false)}>Close</button></footer>
          </article>
        </div>
      )}
    </>
  );
}
