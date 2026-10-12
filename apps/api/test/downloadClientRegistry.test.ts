import { describe, expect, it } from "bun:test";
import { buildAdapter } from "@rawkoon/api/services/downloadClient/registry";
import { afterImportAction } from "@rawkoon/api/services/downloadClient/afterImport";

const config = {
  website_url: "http://localhost",
  username: "u",
  password: "p",
  label: "rawkoon",
};

describe("buildAdapter", () => {
  it("builds the selected client adapter", () => {
    expect(buildAdapter("qbittorrent", config).type).toBe("qbittorrent");
    expect(buildAdapter("transmission", config).type).toBe("transmission");
    expect(buildAdapter("deluge", config).type).toBe("deluge");
    expect(buildAdapter("rdtclient", config).type).toBe("rdtclient");
  });
});

describe("afterImportAction", () => {
  const base = {
    ratio: 0,
    seedingTimeSecs: null,
    rule: { ratio: 2, seedTimeMins: null },
    seedSweepEnabled: false,
    fullyImported: true,
  };

  it("keeps a torrent on a seeding client until its ratio is met", () => {
    expect(afterImportAction({ ...base, type: "qbittorrent" })).toBe("keep");
    expect(afterImportAction({ ...base, type: "qbittorrent", ratio: 2 })).toBe(
      "remove",
    );
  });

  it("leaves removal to the seed sweep when it is on", () => {
    expect(
      afterImportAction({
        ...base,
        type: "qbittorrent",
        ratio: 5,
        seedSweepEnabled: true,
      }),
    ).toBe("keep");
  });

  it("removes rdt-client torrents with their local copy, since they never seed", () => {
    expect(afterImportAction({ ...base, type: "rdtclient" })).toBe(
      "removeWithData",
    );
    expect(
      afterImportAction({ ...base, type: "rdtclient", seedSweepEnabled: true }),
    ).toBe("removeWithData");
  });

  it("keeps an rdt-client torrent whose import didn't place every file", () => {
    expect(
      afterImportAction({ ...base, type: "rdtclient", fullyImported: false }),
    ).toBe("keep");
  });
});

describe("afterImportAction seed targets", () => {
  const rule = { ratio: 2, seedTimeMins: null as number | null };
  const base = {
    type: "qbittorrent" as const,
    ratio: 1,
    seedingTimeSecs: 0 as number | null,
    rule,
    seedSweepEnabled: false,
    fullyImported: true,
  };

  it("keeps a torrent below its target and removes it once met", () => {
    expect(afterImportAction(base)).toBe("keep");
    expect(afterImportAction({ ...base, ratio: 2 })).toBe("remove");
  });

  it("honours a seed-time target", () => {
    const timed = { ratio: null, seedTimeMins: 60 };
    expect(afterImportAction({ ...base, rule: timed })).toBe("keep");
    expect(
      afterImportAction({ ...base, rule: timed, seedingTimeSecs: 3600 }),
    ).toBe("remove");
  });

  it("removes at once when the rule has no target", () => {
    expect(
      afterImportAction({
        ...base,
        ratio: null,
        rule: { ratio: null, seedTimeMins: null },
      }),
    ).toBe("remove");
  });

  it("leaves rdt-client and sweep-on behaviour unchanged", () => {
    expect(afterImportAction({ ...base, type: "rdtclient" })).toBe(
      "removeWithData",
    );
    expect(
      afterImportAction({ ...base, ratio: 9, seedSweepEnabled: true }),
    ).toBe("keep");
  });
});
