import { describe, expect, test } from "bun:test";

import {
  buildEpubTextModel,
  positionToOffset,
} from "@rawkoon/api/services/books/handoff/epubTextModel";
import {
  isHandoffFailure,
  listenToRead,
  readToListen,
} from "@rawkoon/api/services/books/handoff/handoffCore";
import { syntheticWords } from "@rawkoon/api/services/books/handoff/testSupport";
import type { Transcriber } from "@rawkoon/api/services/books/handoff/transcribe";

const model = buildEpubTextModel(
  [1, 2, 3].map((n) => ({
    href: `ch${n}.xhtml`,
    text: `${syntheticWords(1500, n * 7).join(" ")}.`,
  })),
  null,
);

/** Narration at a steady pace behind a silent-ish intro, with a typo every few words. */
function fakeNarrator(introSecs: number, charsPerSec: number) {
  const calls: number[] = [];
  const transcribe: Transcriber = async ({ startSecs, durationSecs }) => {
    calls.push(startSecs);
    if (startSecs < introSecs) return "music";
    const from = Math.round((startSecs - introSecs) * charsPerSec);
    const slice = model.norm.slice(
      from,
      from + Math.round(durationSecs * charsPerSec),
    );
    return slice
      .split(" ")
      .map((w, i) => (i % 9 === 4 ? `${w}s` : w))
      .join(" ");
  };
  return { calls, transcribe };
}

const NARRATION_RATE = 15;
const INTRO = 25;
const durationSecs = INTRO + model.norm.length / NARRATION_RATE + 40;

describe("readToListen", () => {
  test("converges within three calls despite an intro offset", async () => {
    const narrator = fakeNarrator(INTRO, NARRATION_RATE);
    const target = positionToOffset(model, "ch2.xhtml", 0.5) as number;

    const result = await readToListen({
      model,
      transcribe: narrator.transcribe,
      durationSecs,
      spinePath: "ch2.xhtml",
      progression: 0.5,
    });
    if (isHandoffFailure(result)) throw new Error(result.code);

    expect(result.calls).toBeLessThanOrEqual(3);
    const truth = INTRO + target / NARRATION_RATE;
    expect(
      Math.abs(result.position_secs - truth) * NARRATION_RATE,
    ).toBeLessThan(150);
    expect(result.score).toBeGreaterThan(0.8);
  });

  test("steps past intro music when the first guess lands on it", async () => {
    const narrator = fakeNarrator(20, NARRATION_RATE);
    const result = await readToListen({
      model,
      transcribe: narrator.transcribe,
      durationSecs: 20 + model.norm.length / NARRATION_RATE + 40,
      spinePath: "ch1.xhtml",
      progression: 0.02,
    });
    if (isHandoffFailure(result)) throw new Error(result.code);

    expect(narrator.calls[0]).toBeLessThan(20);
    expect(narrator.calls[1]).toBeCloseTo(
      (narrator.calls[0] as number) + 15,
      5,
    );
    expect(result.calls).toBeLessThanOrEqual(3);
  });

  test("gives up as not found when nothing matches", async () => {
    const result = await readToListen({
      model,
      transcribe: async () =>
        "just some unrelated speech that is not in the book at all",
      durationSecs,
      spinePath: "ch1.xhtml",
      progression: 0.3,
    });
    expect(result).toEqual({ ok: false, code: "text_not_found" });
  });

  test("reports an unknown spine path and a failing transcriber", async () => {
    const unknown = await readToListen({
      model,
      transcribe: async () => "",
      durationSecs,
      spinePath: "missing.xhtml",
      progression: 0,
    });
    expect(unknown).toEqual({ ok: false, code: "spine_not_found" });

    const failing = await readToListen({
      model,
      transcribe: async () => {
        throw new Error("boom");
      },
      durationSecs,
      spinePath: "ch1.xhtml",
      progression: 0.1,
    });
    expect(failing).toEqual({ ok: false, code: "transcription_failed" });
  });
});

describe("listenToRead", () => {
  test("returns a locator anchored on the sentence the listener is at", async () => {
    const narrator = fakeNarrator(INTRO, NARRATION_RATE);
    const position = 400;
    const result = await listenToRead({
      model,
      transcribe: narrator.transcribe,
      positionSecs: position,
    });
    if (isHandoffFailure(result)) throw new Error(result.code);

    expect(narrator.calls).toEqual([position - 5]);
    const truthOffset = (position - INTRO) * NARRATION_RATE;
    const found = positionToOffset(
      model,
      result.spine_path,
      result.progression,
    ) as number;
    expect(Math.abs(found - truthOffset)).toBeLessThan(60);

    expect(result.locator.href).toBe(result.spine_path);
    expect(result.locator.type).toBe("application/xhtml+xml");
    expect(result.locator.locations.progression).toBe(result.progression);
    expect(result.locator.locations.totalProgression).toBe(
      result.total_progression,
    );
    expect(result.locator.text?.highlight?.length).toBeGreaterThan(20);
  });

  test("clamps the clip start at the beginning of the book", async () => {
    const narrator = fakeNarrator(0, NARRATION_RATE);
    await listenToRead({
      model,
      transcribe: narrator.transcribe,
      positionSecs: 2,
    });
    expect(narrator.calls).toEqual([0]);
  });

  test("fails as not found on music", async () => {
    const result = await listenToRead({
      model,
      transcribe: async () => "music",
      positionSecs: 10,
    });
    expect(result).toEqual({ ok: false, code: "text_not_found" });
  });
});
