import { describe, expect, it } from "vitest";
import type { TranscodeJob } from "@rawkoon/shared/types";
import { groupBatches, settingsLabel } from "./transcodeTabHelpers";

const job = (id: number, batch_id: string, settings: object = {}) =>
  ({
    id,
    batch_id,
    settings: {
      codec: "hevc",
      encoder: "software",
      resolution: "keep",
      mode: "quality",
      preset: "balanced",
      convertLosslessAudio: false,
      ...settings,
    },
  }) as unknown as TranscodeJob;

describe("settingsLabel", () => {
  it("describes a CPU quality job", () => {
    expect(settingsLabel(job(1, "a"))).toBe("HEVC · CPU · balanced");
  });

  it("describes a GPU target job with downscale and audio conversion", () => {
    const j = job(1, "a", {
      encoder: "vaapi",
      resolution: "1080",
      mode: "target",
      targetVideoKbps: 4500,
      convertLosslessAudio: true,
    });
    expect(settingsLabel(j)).toBe("HEVC · GPU · →1080p · 4.5 Mbps · EAC3");
  });
});

describe("groupBatches", () => {
  it("groups only adjacent jobs sharing a batch id", () => {
    const out = groupBatches([
      job(1, "a"),
      job(2, "a"),
      job(3, "b"),
      job(4, "a"),
    ]);
    expect(out.map((b) => [b.batchId, b.jobs.map((j) => j.id)])).toEqual([
      ["a", [1, 2]],
      ["b", [3]],
      ["a", [4]],
    ]);
  });
});
