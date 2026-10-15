import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AiProviderConfig } from "@rawkoon/api/utils/integrations/types";
import {
  isRateLimited,
  recordAiCall,
  sanitizeAiError,
} from "@rawkoon/api/services/aiProvider/usageLedger";

export const DEFAULT_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
export const CLIP_SECONDS = 10;
const TRANSCRIBE_TIMEOUT_MS = 20_000;
const FFMPEG_TIMEOUT_MS = 30_000;

/** Whole-book seconds in, transcript text out; swapped for a fake in tests. */
export type Transcriber = (clip: {
  startSecs: number;
  durationSecs: number;
}) => Promise<string>;

export interface AudioChapter {
  startSecs: number;
  endSecs: number;
  bookFile: { id: number; filePath: string };
}

export interface AudioSegment {
  filePath: string;
  /** Seconds into that file. */
  offsetSecs: number;
}

/**
 * A chapter's times are on the whole-book timeline, so a file's own zero is the
 * earliest chapter start among the chapters that point at it.
 */
export function resolveAudioSegment(
  chapters: AudioChapter[],
  wholeBookSecs: number,
): AudioSegment | null {
  if (chapters.length === 0) return null;
  const sorted = [...chapters].sort((a, b) => a.startSecs - b.startSecs);
  const last = sorted[sorted.length - 1] as AudioChapter;
  const chapter =
    sorted.find(
      (c) => wholeBookSecs >= c.startSecs && wholeBookSecs < c.endSecs,
    ) ?? (wholeBookSecs >= last.endSecs ? last : sorted[0]);
  if (!chapter) return null;
  const fileStart = Math.min(
    ...sorted
      .filter((c) => c.bookFile.id === chapter.bookFile.id)
      .map((c) => c.startSecs),
  );
  return {
    filePath: chapter.bookFile.filePath,
    offsetSecs: Math.max(0, wholeBookSecs - fileStart),
  };
}

export class TranscriptionError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
  }
}

async function extractClip(
  segment: AudioSegment,
  durationSecs: number,
  outPath: string,
): Promise<void> {
  const proc = Bun.spawn(
    [
      "ffmpeg",
      "-v",
      "error",
      "-y",
      "-ss",
      segment.offsetSecs.toFixed(3),
      "-t",
      String(durationSecs),
      "-i",
      segment.filePath,
      "-vn",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-c:a",
      "flac",
      outPath,
    ],
    { stdout: "ignore", stderr: "pipe" },
  );
  const timer = setTimeout(() => proc.kill(), FFMPEG_TIMEOUT_MS);
  try {
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    if (code !== 0) {
      // stderr names library paths, so it goes to the log, never the ledger.
      console.error("[bookHandoff] ffmpeg failed:", stderr.slice(0, 500));
      throw new TranscriptionError(`ffmpeg failed (exit ${code})`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export interface WhisperTranscriberOptions {
  config: AiProviderConfig;
  chapters: AudioChapter[];
  /** Two-letter code from the ebook's OPF; omitted so Whisper detects it. */
  language: string | null;
  bookEditionId: number;
  fetchImpl?: typeof fetch;
}

/** Clips the audiobook with ffmpeg and posts it to an OpenAI-style transcription endpoint. */
export function createWhisperTranscriber(
  options: WhisperTranscriberOptions,
): Transcriber {
  const { config, chapters, language, bookEditionId } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const model = config.transcription_model ?? DEFAULT_TRANSCRIPTION_MODEL;

  const transcribe = async (clip: {
    startSecs: number;
    durationSecs: number;
  }): Promise<string> => {
    const segment = resolveAudioSegment(chapters, clip.startSecs);
    if (!segment) throw new TranscriptionError("No audio for this position");

    const dir = await mkdtemp(join(tmpdir(), "rawkoon-handoff-"));
    try {
      const clipPath = join(dir, "clip.flac");
      await extractClip(segment, clip.durationSecs, clipPath);

      const form = new FormData();
      form.set(
        "file",
        new Blob([await readFile(clipPath)], { type: "audio/flac" }),
        "clip.flac",
      );
      form.set("model", model);
      form.set("response_format", "json");
      form.set("temperature", "0");
      if (language) form.set("language", language);

      const res = await doFetch(`${config.base_url}/v1/audio/transcriptions`, {
        method: "POST",
        headers: config.api_key
          ? { Authorization: `Bearer ${config.api_key}` }
          : {},
        body: form,
        signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new TranscriptionError(`HTTP ${res.status}`, res.status);
      }
      const body = (await res.json()) as { text?: unknown };
      if (typeof body.text !== "string") {
        throw new TranscriptionError("Response had no text");
      }
      return body.text.trim();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };

  return async (clip) => {
    const started = performance.now();
    const base = {
      ctx: { feature: "book_sync" as const, bookEditionId },
      model,
      structured: false,
    };
    try {
      const text = await transcribe(clip);
      recordAiCall({
        ...base,
        status: "ok",
        durationMs: performance.now() - started,
      });
      return text;
    } catch (error) {
      recordAiCall({
        ...base,
        status: isRateLimited(error) ? "rate_limited" : "error",
        error: sanitizeAiError(error, config.api_key),
        durationMs: performance.now() - started,
      });
      throw error;
    }
  };
}
