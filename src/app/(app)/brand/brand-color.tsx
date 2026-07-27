"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function BrandColor({
  name,
  value,
  usage,
}: {
  name: string;
  value: string;
  usage: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyColor() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article>
      <span style={{ backgroundColor: value }} />
      <div>
        <strong>{name}</strong>
        <p>{usage}</p>
        <button type="button" onClick={copyColor}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : value}
        </button>
      </div>
    </article>
  );
}
