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
    minSeedRatio: 2,
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
