import { beforeEach, describe, expect, mock, test } from "bun:test";

type EditionRow = Record<string, unknown> | null;
let ebook: EditionRow = null;
let audiobook: EditionRow = null;

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    bookEdition: {
      findUnique: mock(
        async (args: { where: { bookId_kind: { kind: string } } }) =>
          args.where.bookId_kind.kind === "ebook" ? ebook : audiobook,
      ),
    },
  },
}));

const { buildEpubTextModel } = await import(
  "@rawkoon/api/services/books/handoff/epubTextModel"
);
const { handoffToAudiobook, handoffToEbook } = await import(
  "@rawkoon/api/services/books/handoff/bookHandoff"
);
type HandoffDeps =
  import("@rawkoon/api/services/books/handoff/bookHandoff").HandoffDeps;

const model = buildEpubTextModel(
  [
    {
      href: "a.xhtml",
      text: "Une phrase assez longue pour servir de transcription dans ce test.",
    },
  ],
  null,
);

const transcribe = mock(
  async () => "une phrase assez longue pour servir de transcription",
);
const createTranscriber = mock(() => transcribe);

const deps = (overrides: Partial<HandoffDeps> = {}): HandoffDeps => ({
  loadConfig: async () => ({ base_url: "http://ai.test", model: "m" }),
  checkGate: async () => ({ allowed: true }),
  loadModel: async () => model,
  createTranscriber,
  ...overrides,
});

beforeEach(() => {
  transcribe.mockClear();
  createTranscriber.mockClear();
  ebook = { files: [{ filePath: "/x/book.epub", format: "epub" }] };
  audiobook = {
    id: 7,
    durationSecs: 100,
    chapters: [
      { startSecs: 0, endSecs: 100, bookFile: { id: 1, filePath: "/x/a.m4b" } },
    ],
  };
});

describe("handoff feature gate", () => {
  test("a disabled book_sync feature never reaches the transcriber", async () => {
    const result = await handoffToEbook(
      1,
      10,
      deps({
        checkGate: async () => ({ allowed: false, reason: "feature_disabled" }),
      }),
    );
    expect(result).toEqual({ ok: false, code: "feature_disabled" });
    expect(createTranscriber).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  test("a spent budget stops read to listen too", async () => {
    const result = await handoffToAudiobook(
      1,
      "a.xhtml",
      0.5,
      deps({
        checkGate: async () => ({ allowed: false, reason: "budget_exceeded" }),
      }),
    );
    expect(result).toEqual({ ok: false, code: "budget_exceeded" });
    expect(transcribe).not.toHaveBeenCalled();
  });

  test("a disabled provider is reported before the gate is asked", async () => {
    const checkGate = mock(async () => ({ allowed: true as const }));
    const result = await handoffToEbook(
      1,
      10,
      deps({ loadConfig: async () => null, checkGate }),
    );
    expect(result).toEqual({ ok: false, code: "ai_provider_disabled" });
    expect(checkGate).not.toHaveBeenCalled();
  });

  test("an allowed call transcribes once", async () => {
    const result = await handoffToEbook(1, 10, deps());
    expect(result).toMatchObject({ spine_path: "a.xhtml" });
    expect(transcribe).toHaveBeenCalledTimes(1);
  });
});

describe("handoff source resolution", () => {
  test("missing editions, epub file or audio are all not-found codes", async () => {
    ebook = null;
    expect(await handoffToEbook(1, 1, deps())).toEqual({
      ok: false,
      code: "no_ebook_edition",
    });

    ebook = { files: [{ filePath: "/x/book.mobi", format: "mobi" }] };
    expect(await handoffToEbook(1, 1, deps())).toEqual({
      ok: false,
      code: "no_epub_file",
    });

    ebook = { files: [{ filePath: "/x/book.epub", format: "epub" }] };
    audiobook = null;
    expect(await handoffToEbook(1, 1, deps())).toEqual({
      ok: false,
      code: "no_audiobook_edition",
    });

    audiobook = { id: 7, durationSecs: 0, chapters: [] };
    expect(await handoffToEbook(1, 1, deps())).toEqual({
      ok: false,
      code: "no_audio_file",
    });
    expect(createTranscriber).not.toHaveBeenCalled();
  });
});
