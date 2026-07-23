import {
  BriefcaseBusiness,
  CheckCircle2,
  ListTodo,
  Radar,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { updateTeamMember } from "./actions";
import { MemberModal } from "./member-modal";
import { requireFounder } from "@/lib/role-access";

export default async function TeamPage() {
  await requireFounder();
  const session = await auth();
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "thrive-dev" },
  });
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { workspaceId: workspace?.id },
      include: {
        roles: { include: { role: true } },
        _count: {
          select: {
            assignedLeads: true,
            assignedTasks: true,
            ownedOpportunities: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.role.findMany({
      where: { workspaceId: workspace?.id },
      include: { _count: { select: { permissions: true, users: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const active = users.filter((user) => user.status === "ACTIVE").length;
  const founders = users.filter(
    (user) =>
      user.status === "ACTIVE" &&
      user.roles.some((item) => item.role.key === "founder"),
  ).length;
  return (
    <>
      <div className="list-heading">
        <div>
          <p className="eyebrow">ADMIN · PEOPLE & ACCESS</p>
          <h1>Team</h1>
          <p>Members, workload and workspace access</p>
        </div>
        <MemberModal
          roles={roles.map(({ key, name, description }) => ({
            key,
            name,
            description,
          }))}
        />
      </div>
      <section className="team-summary-cards">
        <article>
          <UsersRound />
          <div>
            <strong>{active}</strong>
            <span>Active members</span>
          </div>
        </article>
        <article>
          <ShieldCheck />
          <div>
            <strong>{founders}</strong>
            <span>Founders</span>
          </div>
        </article>
        <article>
          <UserRoundCheck />
          <div>
            <strong>{roles.length}</strong>
            <span>Access roles</span>
          </div>
        </article>
      </section>
      <section className="team-list improved-team-list">
        <header>
          <div>
            <h2>
              <UsersRound size={15} />
              Members
            </h2>
            <p>Only founders can change roles and account access.</p>
          </div>
          <span>{users.length} total</span>
        </header>
        {users.map((user) => {
          const role = user.roles[0]?.role;
          const self = user.email === session?.user?.email;
          return (
            <article
              className={user.status !== "ACTIVE" ? "member-suspended" : ""}
              key={user.id}
            >
              <span className="member-avatar">{initials(user.name)}</span>
              <div className="member-identity">
                <strong>
                  {user.name}
                  {self && <em>You</em>}
                </strong>
                <small>{user.email}</small>
              </div>
              <div className="member-workload">
                <span>
                  <Radar />
                  {user._count.assignedLeads} leads
                </span>
                <span>
                  <BriefcaseBusiness />
                  {user._count.ownedOpportunities} deals
                </span>
                <span>
                  <ListTodo />
                  {user._count.assignedTasks} tasks
                </span>
              </div>
              <form action={updateTeamMember} className="member-access">
                <input type="hidden" name="userId" value={user.id} />
                <label>
                  <span>Role</span>
                  <select
                    name="roleKey"
                    defaultValue={role?.key ?? roles[0]?.key}
                    disabled={self}
                  >
                    {roles.map((item) => (
                      <option key={item.id} value={item.key}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {self && (
                    <input type="hidden" name="roleKey" value="founder" />
                  )}
                </label>
                <label>
                  <span>Status</span>
                  <select
                    name="status"
                    defaultValue={user.status}
                    disabled={self}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INVITED">Invited</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                  {self && <input type="hidden" name="status" value="ACTIVE" />}
                </label>
                <button disabled={self}>Save</button>
              </form>
              <span className={`member-status ${user.status.toLowerCase()}`}>
                <i />
                {user.status.toLowerCase()}
              </span>
            </article>
          );
        })}
      </section>
      <section className="role-overview">
        <header>
          <h2>Roles and permissions</h2>
          <p>Quick overview of access assigned in this workspace.</p>
        </header>
        <div>
          {roles.map((role) => (
            <article key={role.id}>
              <span>
                <ShieldCheck />
              </span>
              <div>
                <strong>{role.name}</strong>
                <p>{role.description ?? "Workspace access role"}</p>
              </div>
              <small>
                {role._count.users} members · {role._count.permissions}{" "}
                permissions
              </small>
              <CheckCircle2 />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
