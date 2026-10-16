import { describe, it, expect, mock, afterAll, beforeEach } from "bun:test";

let clientEnabled = true;
let clientReachable = true;

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    user: {
      findUnique: async () => ({
        id: "u1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        isAdmin: false,
        locale: null,
        lastLogin: null,
        createdAt: null,
        lastActivity: null,
        avatarUrl: null,
        navPosition: null,
      }),
    },
    downloadHistory: {
      findMany: async () => [
        {
          id: 4,
          releaseTitle: "Some.Movie.2020.1080p",
          torrentHash: "AAA",
          season: null,
          media: { id: 9, title: "Some Movie", type: "movie", posterUrl: null },
          episode: null,
        },
      ],
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
mock.module("@rawkoon/api/services/downloadClient/registry", () => ({
  buildAdapter: (type: string) => ({ type }),
  resolveActiveAdapter: async () =>
    clientEnabled
      ? {
          label: "rawkoon",
          adapter: {
            type: "transmission",
            listTorrents: async () => {
              if (!clientReachable) throw new Error("down");
              return [
                {
                  hash: "aaa",
                  name: "A",
                  progress: 0.25,
                  dlSpeed: 1000,
                  state: "downloading",
                  sizeBytes: 100_000,
                },
              ];
            },
          },
        }
      : null,
}));

const { dashboardDownloadsRoutes } = await import(
  "@rawkoon/api/routes/dashboard/downloads"
);

afterAll(() => mock.restore());

beforeEach(() => {
  clientEnabled = true;
  clientReachable = true;
});

const get = async () => {
  const res = await dashboardDownloadsRoutes.request(
    new Request("http://localhost/downloads/active"),
  );
  return { status: res.status, body: (await res.json()) as unknown };
};

describe("GET /downloads/active", () => {
  it("maps in-flight grabs to live progress for any signed-in user", async () => {
    const { status, body } = await get();
    expect(status).toBe(200);
    expect(body).toMatchObject({
      enabled: true,
      connected: true,
      items: [
        {
          id: 4,
          media_id: 9,
          media_title: "Some Movie",
          progress: 0.25,
          download_speed: 1000,
          eta_seconds: 75,
        },
      ],
    });
  });

  it("reports an unreachable client instead of failing", async () => {
    clientReachable = false;
    const { status, body } = await get();
    expect(status).toBe(200);
    expect(body).toEqual({ enabled: true, connected: false, items: [] });
  });

  it("reports no client configured", async () => {
    clientEnabled = false;
    const { body } = await get();
    expect(body).toEqual({ enabled: false, connected: false, items: [] });
  });
});
