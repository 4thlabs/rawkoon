import { describe, expect, it } from "bun:test";
import { parseQbittorrentAddResponse } from "./parseAddResponse";

describe("parseQbittorrentAddResponse", () => {
  it("accepts the legacy plain-text sentinel", () => {
    expect(parseQbittorrentAddResponse("Ok.").ok).toBe(true);
    expect(parseQbittorrentAddResponse("ok").ok).toBe(true);
    expect(parseQbittorrentAddResponse("  Ok.\n").ok).toBe(true);
  });

  it("accepts qBittorrent 5.x JSON reporting success_count or added_torrent_ids", () => {
    expect(
      parseQbittorrentAddResponse(
        JSON.stringify({ added_torrent_ids: ["abc"], success_count: 1 }),
      ).ok,
    ).toBe(true);
    expect(
      parseQbittorrentAddResponse(
        JSON.stringify({ added_torrent_ids: ["abc"], success_count: 0 }),
      ).ok,
    ).toBe(true);
  });

  it("accepts a magnet still resolving metadata (pending_count, no success yet)", () => {
    expect(
      parseQbittorrentAddResponse(
        JSON.stringify({
          added_torrent_ids: [],
          success_count: 0,
          pending_count: 1,
          failure_count: 0,
        }),
      ).ok,
    ).toBe(true);
  });

  it("rejects a genuine failure (no success, no pending)", () => {
    const result = parseQbittorrentAddResponse(
      JSON.stringify({
        added_torrent_ids: [],
        success_count: 0,
        pending_count: 0,
        failure_count: 1,
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects unrecognized bodies", () => {
    expect(parseQbittorrentAddResponse("Fails.").ok).toBe(false);
    expect(parseQbittorrentAddResponse("not json, not ok").ok).toBe(false);
  });

  it("accepts rdt-client's bare Ok() success (empty body) and rejects its Fails.", () => {
    expect(parseQbittorrentAddResponse("").ok).toBe(true);
    expect(parseQbittorrentAddResponse("   ").ok).toBe(true);
    expect(parseQbittorrentAddResponse("Fails.").ok).toBe(false);
  });
});
