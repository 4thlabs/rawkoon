import { describe, it, expect, mock, afterAll, beforeEach } from "bun:test";

let heldCount = 0;
const updateMany = mock(
  async (_a: { where: { targetKey: string }; data: { grabAfter: Date } }) => ({
    count: heldCount,
  }),
);

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    user: {
      findUnique: async () => ({
        id: "u1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        isAdmin: true,
        locale: null,
        lastLogin: null,
        createdAt: null,
        lastActivity: null,
        avatarUrl: null,
        navPosition: null,
      }),
    },
    // The real worker runs against this: nothing is due, so nothing is grabbed.
    pendingRelease: {
      updateMany,
      deleteMany: async () => ({ count: 0 }),
      findMany: async () => [],
    },
  },
}));
mock.module("@rawkoon/api/lib/auth", () => ({
  auth: {
    api: { getSession: async () => ({ user: { id: "u1" } }) },
    handler: async () => new Response("", { status: 404 }),
  },
  refreshOidcProviders: () => {},
}));

const { downloadsRoutes } = await import("@rawkoon/api/routes/downloads");

afterAll(() => mock.restore());

beforeEach(() => {
  heldCount = 0;
  updateMany.mockClear();
});

const post = (body: unknown) =>
  downloadsRoutes.request(
    new Request("http://localhost/pending-releases/grab-now", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /pending-releases/grab-now", () => {
  it("rejects a target key that grabDelay would never produce", async () => {
    const res = await post({ target_key: "x:1; drop" });
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("answers 404 when nothing is held for the target", async () => {
    const res = await post({ target_key: "m:5" });
    expect(res.status).toBe(404);
  });

  it("pulls the held window forward for that target only", async () => {
    heldCount = 2;
    const res = await post({ target_key: "s:5:2" });
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany.mock.calls[0]![0].where).toEqual({ targetKey: "s:5:2" });
    expect(await res.json()).toEqual({ grabbed: false });
  });
});
