import { Check, CircleAlert, Clock3, ListTodo } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { completeTask } from "./actions";
import { TaskModal } from "./task-modal";
import { getAccessContext } from "@/lib/role-access";
export default async function TasksPage() {
  const { workspace, user, founder } = await getAccessContext();
  const [tasks, companies] = await Promise.all([
    prisma.task.findMany({
      where: {
        workspaceId: workspace?.id,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        ...(!founder ? { assigneeId: user.id } : {}),
      },
      include: { company: true, assignee: { select: { name: true } } },
      orderBy: [{ dueAt: "asc" }],
      take: 100,
    }),
    prisma.company.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, ...(!founder ? { ownerId: user.id } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const overdue = tasks.filter((task) => task.dueAt < new Date()).length;
  return (
    <>
      <div className="list-heading">
        <div>
          <p className="eyebrow">WORK · NEXT ACTIONS</p>
          <h1>Tasks</h1>
          <p>Every open item must have an owner and due date</p>
        </div>
        <TaskModal companies={companies} />
      </div>
      <div className="task-summary">
        <div>
          <ListTodo />
          <span>
            <strong>{tasks.length}</strong>
            <small>Open tasks</small>
          </span>
        </div>
        <div className={overdue ? "danger" : ""}>
          <CircleAlert />
          <span>
            <strong>{overdue}</strong>
            <small>Overdue</small>
          </span>
        </div>
        <div>
          <Clock3 />
          <span>
            <strong>
              {
                tasks.filter(
                  (t) => t.dueAt.toDateString() === new Date().toDateString(),
                ).length
              }
            </strong>
            <small>Due today</small>
          </span>
        </div>
      </div>
      <div className="tasks-layout single-column">
        <section className="operational-list">
          <header>
            <h2>Next actions</h2>
            <span>{tasks.length} items</span>
          </header>
          {tasks.length ? (
            tasks.map((task) => (
              <article className="operational-task" key={task.id}>
                <form action={completeTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <button aria-label={`Complete ${task.title}`}>
                    <Check size={15} />
                  </button>
                </form>
                <div>
                  <strong>{task.title}</strong>
                  <p>
                    {task.company?.name ?? "Internal"} ·{" "}
                    {task.type.toLowerCase().replaceAll("_", " ")}
                  </p>
                </div>
                <span
                  className={`priority priority-${task.priority.toLowerCase()}`}
                >
                  {task.priority.toLowerCase()}
                </span>
                <time className={task.dueAt < new Date() ? "overdue" : ""}>
                  {task.dueAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <Check size={27} />
              <h2>Everything is complete</h2>
              <p>No open tasks.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
