import { describe, expect, it } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkvAppend, tracksCompatible, type TrackShape } from "./mkvMerge";

function file(
  audioLanguages: string[],
  subtitleLanguages: string[],
  videoCodec = "AV1",
): TrackShape {
  return {
    videoCodec,
    audioTracks: audioLanguages.map((language, index) => ({
      index,
      language,
      language_name: language,
      title: null,
      codec: "EAC3",
      channels: 6,
      channel_layout: "5.1",
      bitrate_kbps: 640,
      default: index === 0,
      forced: false,
    })),
    subtitleTracks: subtitleLanguages.map((language, index) => ({
      index,
      language,
      language_name: language,
      title: null,
      format: "SRT",
      forced: false,
      hearing_impaired: false,
    })),
  };
}

describe("tracksCompatible", () => {
  it("accepts identical layouts", () => {
    expect(
      tracksCompatible(
        file(["fre", "eng"], ["fre", "fre", "eng"]),
        file(["fre", "eng"], ["fre", "fre", "eng"]),
      ),
    ).toBe(true);
  });

  it("rejects a differing video codec", () => {
    expect(
      tracksCompatible(
        file(["fre", "eng"], [], "AV1"),
        file(["fre", "eng"], [], "H264"),
      ),
    ).toBe(false);
  });

  it("rejects a differing audio track count", () => {
    expect(tracksCompatible(file(["fre", "eng"], []), file(["fre"], []))).toBe(
      false,
    );
  });

  it("rejects a differing subtitle track count", () => {
    expect(
      tracksCompatible(file(["fre"], ["fre", "eng"]), file(["fre"], ["fre"])),
    ).toBe(false);
  });

  it("rejects differing audio languages", () => {
    expect(
      tracksCompatible(file(["fre", "eng"], []), file(["eng", "spa"], [])),
    ).toBe(false);
  });

  it("rejects a differing audio track order", () => {
    // mkvmerge appends by track order, so swapped languages would leave the
    // second half of the episode playing the wrong audio.
    expect(
      tracksCompatible(file(["fre", "eng"], []), file(["eng", "fre"], [])),
    ).toBe(false);
  });
});

const tools = ["mkvmerge", "mediainfo", "ffmpeg"].every((t) => Bun.which(t));

async function clip(path: string, args: string[]): Promise<void> {
  const proc = Bun.spawn(
    ["ffmpeg", "-loglevel", "error", "-y", ...args, path],
    { stdout: "ignore", stderr: "ignore" },
  );
  if ((await proc.exited) !== 0) throw new Error(`ffmpeg failed for ${path}`);
}

const video = ["-f", "lavfi", "-i", "testsrc=duration=2:size=64x64:rate=10"];

describe.skipIf(!tools)("mkvAppend", () => {
  it("writes the merged file in place and leaves no temp file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rawkoon-mkv-"));
    try {
      await clip(join(dir, "a.mkv"), video);
      await clip(join(dir, "b.mkv"), video);
      const out = join(dir, "lib", "Show - S01E01.mkv");
      expect(
        await mkvAppend([join(dir, "a.mkv"), join(dir, "b.mkv")], out),
      ).toBe(true);
      expect(await readdir(join(dir, "lib"))).toEqual(["Show - S01E01.mkv"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("leaves nothing at the destination when the merge fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rawkoon-mkv-"));
    try {
      await clip(join(dir, "a.mkv"), video);
      await clip(join(dir, "b.mkv"), [
        "-f",
        "lavfi",
        "-i",
        "sine=duration=2",
        "-c:a",
        "flac",
      ]);
      const out = join(dir, "lib", "Show - S01E01.mkv");
      expect(
        await mkvAppend([join(dir, "a.mkv"), join(dir, "b.mkv")], out),
      ).toBe(false);
      expect(await readdir(join(dir, "lib"))).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
