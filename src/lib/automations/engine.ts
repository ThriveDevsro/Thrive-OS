import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const automationEvents = [
  "email.received",
  "email.sent",
  "lead.created",
  "opportunity.stage_changed",
  "no_activity",
] as const;

type AutomationEvent = (typeof automationEvents)[number];
type EventPayload = {
  ownerId?: string | null;
  title?: string;
  companyId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  leadId?: string | null;
  threadId?: string | null;
  score?: number;
  stage?: string;
  days?: number;
  direction?: string;
};

export async function emitAutomationEvent(input: {
  workspaceId: string;
  eventId: string;
  event: AutomationEvent;
  payload: EventPayload;
}) {
  const automations = await prisma.automation.findMany({
    where: { workspaceId: input.workspaceId, active: true },
  });
  const matching = automations.filter((automation) => {
    const trigger = asRecord(automation.trigger);
    return trigger.event === input.event;
  });
  const results = [];
  for (const automation of matching) {
    results.push(await runAutomation(automation, input));
  }
  return results;
}

async function runAutomation(
  automation: {
    id: string;
    workspaceId: string;
    name: string;
    conditions: Prisma.JsonValue;
    actions: Prisma.JsonValue;
  },
  event: {
    workspaceId: string;
    eventId: string;
    event: AutomationEvent;
    payload: EventPayload;
  },
) {
  let run: { id: string };
  try {
    run = await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        eventId: event.eventId,
        eventType: event.event,
        status: "RUNNING",
        input: safeEventInput(event.payload),
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return { status: "DUPLICATE" };
    throw error;
  }

  try {
    const conditions = Array.isArray(automation.conditions)
      ? automation.conditions
      : [];
    if (
      !conditions.every((condition) =>
        matchesAutomationCondition(condition, event.payload),
      )
    ) {
      await prisma.automationRun.update({
        where: { id: run.id },
        data: {
          status: "SKIPPED",
          output: { reason: "CONDITIONS_NOT_MET" },
          completedAt: new Date(),
        },
      });
      return { status: "SKIPPED" };
    }
    const actions = Array.isArray(automation.actions) ? automation.actions : [];
    const output = [];
    for (const rawAction of actions) {
      output.push(
        await executeAction(
          asRecord(rawAction),
          event.workspaceId,
          event.payload,
        ),
      );
    }
    await prisma.$transaction([
      prisma.automationRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCEEDED",
          output,
          completedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId: event.workspaceId,
          action: "automation.completed",
          recordType: "Automation",
          recordId: automation.id,
          source: "AUTOMATION",
          newValue: {
            eventType: event.event,
            actionCount: output.length,
            status: "SUCCEEDED",
          },
        },
      }),
    ]);
    return { status: "SUCCEEDED", output };
  } catch {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: "AUTOMATION_ACTION_FAILED",
        completedAt: new Date(),
      },
    });
    return { status: "FAILED" };
  }
}

async function executeAction(
  action: Record<string, unknown>,
  workspaceId: string,
  payload: EventPayload,
) {
  if (action.type === "notify_owner") {
    if (!payload.ownerId) return { type: action.type, status: "NO_OWNER" };
    const notification = await prisma.notification.create({
      data: {
        workspaceId,
        userId: payload.ownerId,
        type: "AUTOMATION",
        title: String(action.title ?? payload.title ?? "CRM needs attention"),
        body: String(
          action.body ?? "Open Thrive OS and review the related record.",
        ).slice(0, 500),
      },
    });
    return { type: action.type, status: "CREATED", id: notification.id };
  }
  if (action.type === "create_task" || action.type === "schedule_follow_up") {
    if (!payload.ownerId) return { type: action.type, status: "NO_OWNER" };
    const dueAt = new Date();
    const days =
      action.type === "schedule_follow_up"
        ? Math.min(Math.max(Number(action.days ?? 1), 0), 30)
        : 0;
    dueAt.setUTCDate(dueAt.getUTCDate() + days);
    const task = await prisma.task.create({
      data: {
        workspaceId,
        assigneeId: payload.ownerId,
        createdById: payload.ownerId,
        companyId: payload.companyId,
        contactId: payload.contactId,
        opportunityId: payload.opportunityId,
        title: String(
          action.title ??
            (action.type === "schedule_follow_up"
              ? `Follow up: ${payload.title ?? "customer conversation"}`
              : `Review: ${payload.title ?? "CRM record"}`),
        ).slice(0, 180),
        type: String(action.taskType ?? "FOLLOW_UP"),
        status: "OPEN",
        priority: Number(payload.score ?? 0) >= 80 ? "HIGH" : "NORMAL",
        dueAt,
        notes: "Created automatically by an approved Thrive OS automation.",
      },
    });
    return { type: action.type, status: "CREATED", id: task.id };
  }
  if (action.type === "set_thread_status") {
    if (!payload.threadId) return { type: action.type, status: "NO_THREAD" };
    const status = ["OPEN", "WAITING_FOR_US", "WAITING_FOR_CUSTOMER"].includes(
      String(action.status),
    )
      ? String(action.status)
      : "OPEN";
    await prisma.emailThread.updateMany({
      where: { id: payload.threadId, workspaceId },
      data: { status },
    });
    return { type: action.type, status: "UPDATED" };
  }
  return { type: String(action.type ?? "unknown"), status: "NOT_ALLOWED" };
}

export function matchesAutomationCondition(
  condition: unknown,
  payload: EventPayload,
) {
  const rule = asRecord(condition);
  const field = String(rule.field ?? "");
  if (!["score", "stage", "days", "direction"].includes(field)) return false;
  const actual = payload[field as keyof EventPayload];
  if (rule.operator === "eq") return actual === rule.value;
  if (rule.operator === "gte") return Number(actual) >= Number(rule.value);
  if (rule.operator === "lte") return Number(actual) <= Number(rule.value);
  return false;
}

function safeEventInput(payload: EventPayload): Prisma.InputJsonObject {
  return {
    ownerId: payload.ownerId ?? null,
    companyId: payload.companyId ?? null,
    contactId: payload.contactId ?? null,
    opportunityId: payload.opportunityId ?? null,
    leadId: payload.leadId ?? null,
    threadId: payload.threadId ?? null,
    score: payload.score ?? null,
    stage: payload.stage ?? null,
    days: payload.days ?? null,
    direction: payload.direction ?? null,
    title: payload.title?.slice(0, 180) ?? null,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
