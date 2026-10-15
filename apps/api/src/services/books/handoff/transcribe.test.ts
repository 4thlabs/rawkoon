import { describe, expect, test } from "bun:test";

import { resolveAudioSegment } from "@rawkoon/api/services/books/handoff/transcribe";

const chapter = (
  startSecs: number,
  endSecs: number,
  id: number,
  filePath: string,
) => ({ startSecs, endSecs, bookFile: { id, filePath } });

describe("resolveAudioSegment", () => {
  const chapters = [
    chapter(0, 60, 1, "/a.mp3"),
    chapter(60, 150, 2, "/b.m4b"),
    chapter(150, 200, 2, "/b.m4b"),
  ];

  test("maps a whole-book time to the file and the offset inside it", () => {
    expect(resolveAudioSegment(chapters, 30)).toEqual({
      filePath: "/a.mp3",
      offsetSecs: 30,
    });
    // Offsets are relative to the earliest chapter of the file, not each chapter.
    expect(resolveAudioSegment(chapters, 170)).toEqual({
      filePath: "/b.m4b",
      offsetSecs: 110,
    });
  });

  test("clamps past the end to the last file and handles no chapters", () => {
    expect(resolveAudioSegment(chapters, 999)?.filePath).toBe("/b.m4b");
    expect(resolveAudioSegment([], 5)).toBeNull();
  });
});
