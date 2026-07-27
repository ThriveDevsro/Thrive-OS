export function buildMimeMessage(input: {
  from: string;
  to: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string | null;
}) {
  const from = safeHeader(input.from);
  const to = safeHeader(input.to);
  const subject = Buffer.from(input.subject, "utf8").toString("base64");
  const messageId = safeMessageId(input.messageId);
  const inReplyTo = input.inReplyTo
    ? safeMessageId(input.inReplyTo)
    : null;
  const body =
    Buffer.from(input.body, "utf8")
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") ?? "";
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${subject}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    ...(inReplyTo
      ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`]
      : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function safeMessageId(value: string) {
  const normalized = safeHeader(value);
  if (!/^<[^<>\s@]+@[^<>\s@]+>$/.test(normalized)) {
    throw new Error("INVALID_MESSAGE_ID");
  }
  return normalized;
}
