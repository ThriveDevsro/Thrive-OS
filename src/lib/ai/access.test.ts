import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, workspaceFindUnique, userFindFirst } = vi.hoisted(() => ({
  auth: vi.fn(),
  workspaceFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
}));

vi.mock("../../../auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: workspaceFindUnique },
    user: { findFirst: userFindFirst },
  },
}));

import { getAiAccessContext } from "./access";

beforeEach(() => vi.clearAllMocks());

describe("AI endpoint access context", () => {
  it("rejects an unauthenticated request before database access", async () => {
    auth.mockResolvedValue(null);
    await expect(getAiAccessContext()).rejects.toMatchObject({
      code: "AI_PERMISSION_DENIED",
      httpStatus: 401,
    });
    expect(workspaceFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a user outside the active workspace", async () => {
    auth.mockResolvedValue({
      user: { email: "outside@example.test", role: "salesperson" },
    });
    workspaceFindUnique.mockResolvedValue({ id: "workspace" });
    userFindFirst.mockResolvedValue(null);
    await expect(getAiAccessContext()).rejects.toMatchObject({
      code: "AI_PERMISSION_DENIED",
      httpStatus: 403,
    });
    expect(userFindFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: "workspace",
        email: "outside@example.test",
        status: "ACTIVE",
      },
      select: { id: true },
    });
  });
});
