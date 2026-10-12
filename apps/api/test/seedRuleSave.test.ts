import { describe, it, expect, mock, afterAll } from "bun:test";

type Rule = {
  indexerName: string;
  ratio: number | null;
  seedTimeMins: number | null;
};
const store = new Map<string, Rule>();

// Like the real table: a create for an existing name hits the unique constraint.
const indexerSeedRule = {
  findFirst: async () => null,
  create: async ({ data }: { data: Rule }) => {
    await Promise.resolve();
    if (store.has(data.indexerName))
      throw new Error("Unique constraint failed");
    store.set(data.indexerName, data);
    return data;
  },
  update: async () => {
    throw new Error("update is not expected for a new indexer");
  },
  upsert: async ({
    where,
    update,
    create,
  }: {
    where: { indexerName: string };
    update: Partial<Rule>;
    create: Rule;
  }) => {
    const cur = store.get(where.indexerName);
    const next = cur ? { ...cur, ...update } : create;
    store.set(where.indexerName, next);
    return next;
  },
};

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
    indexerSeedRule,
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

const put = (ratio: number) =>
  downloadsRoutes.request(
    new Request("http://localhost/seed-rules/NewTracker", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ratio, seed_time_mins: null }),
    }),
  );

describe("PUT /seed-rules/:indexer", () => {
  it("lets two concurrent first saves for one indexer both succeed", async () => {
    const [a, b] = await Promise.all([put(1), put(2)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(store.size).toBe(1);
  });
});
