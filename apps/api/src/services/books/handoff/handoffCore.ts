import {
  offsetToPosition,
  positionToOffset,
  snippetAtOffset,
  totalNormChars,
  type EpubTextModel,
} from "@rawkoon/api/services/books/handoff/epubTextModel";
import { locateTranscript } from "@rawkoon/api/services/books/handoff/fuzzyLocate";
import {
  CLIP_SECONDS,
  type Transcriber,
} from "@rawkoon/api/services/books/handoff/transcribe";
import type {
  BookHandoffToAudiobookResponse,
  BookReadiumLocator,
  BookHandoffToEbookResponse,
} from "@rawkoon/shared/types";

export type HandoffFailure =
  | { ok: false; code: "text_not_found" }
  | { ok: false; code: "transcription_failed" }
  | { ok: false; code: "spine_not_found" };

/** The clip starts this long before the listener's position so it centres on it. */
const LEAD_IN_SECS = CLIP_SECONDS / 2;
const MAX_READ_TO_LISTEN_CALLS = 3;
/** Close enough that another pass would only move the answer by a sentence. */
const CONVERGED_CHARS = 150;
/** Jump past intro music or credits when a pass finds no text. */
const NOT_FOUND_NUDGE_SECS = 15;

const MIME_TYPE = "application/xhtml+xml";

/**
 * Whisper only hears speech, so the clip start is a few seconds before the
 * listener; the position sits that share of the transcript further on.
 */
function advanceToListener(
  model: EpubTextModel,
  matchOffset: number,
  transcriptNormLength: number,
): number {
  const target =
    matchOffset +
    Math.round((transcriptNormLength * LEAD_IN_SECS) / CLIP_SECONDS);
  // Snap forward to a word start so the snippet never opens mid-word.
  const next = model.norm.indexOf(" ", target);
  const snapped = next === -1 ? target : next + 1;
  return Math.min(snapped, Math.max(0, totalNormChars(model) - 1));
}

export async function listenToRead(input: {
  model: EpubTextModel;
  transcribe: Transcriber;
  positionSecs: number;
}): Promise<BookHandoffToEbookResponse | HandoffFailure> {
  const { model, transcribe } = input;
  const startSecs = Math.max(0, input.positionSecs - LEAD_IN_SECS);

  let transcript: string;
  try {
    transcript = await transcribe({ startSecs, durationSecs: CLIP_SECONDS });
  } catch {
    return { ok: false, code: "transcription_failed" };
  }

  const match = locateTranscript(model, transcript);
  if (!match) return { ok: false, code: "text_not_found" };

  // A clip clamped at the book start has less lead-in than the full five seconds.
  const leadInSecs = input.positionSecs - startSecs;
  const offset = advanceToListener(
    model,
    match.offset,
    (match.transcriptNormLength * leadInSecs) / LEAD_IN_SECS,
  );
  const position = offsetToPosition(model, offset);
  const snippet = snippetAtOffset(model, offset);
  const locator: BookReadiumLocator = {
    href: position.href,
    type: MIME_TYPE,
    locations: {
      progression: position.progression,
      totalProgression: position.totalProgression,
    },
    text: snippet,
  };

  return {
    locator,
    spine_index: position.spineIndex,
    spine_path: position.href,
    progression: position.progression,
    total_progression: position.totalProgression,
    score: match.score,
    transcript,
  };
}

export async function readToListen(input: {
  model: EpubTextModel;
  transcribe: Transcriber;
  durationSecs: number;
  spinePath: string;
  progression: number;
}): Promise<BookHandoffToAudiobookResponse | HandoffFailure> {
  const { model, transcribe, durationSecs } = input;
  const target = positionToOffset(model, input.spinePath, input.progression);
  if (target === null) return { ok: false, code: "spine_not_found" };

  const totalChars = Math.max(1, totalNormChars(model));
  const charsPerSec = totalChars / Math.max(1, durationSecs);
  const clampSecs = (secs: number) =>
    Math.min(Math.max(secs, 0), Math.max(0, durationSecs - 1));

  let t = clampSecs((target / totalChars) * durationSecs);
  let nudged = false;
  let calls = 0;
  let best: { positionSecs: number; score: number; transcript: string } | null =
    null;
  let failedTranscription = false;

  while (calls < MAX_READ_TO_LISTEN_CALLS) {
    calls++;
    let transcript: string;
    try {
      transcript = await transcribe({
        startSecs: t,
        durationSecs: CLIP_SECONDS,
      });
    } catch {
      failedTranscription = true;
      break;
    }

    const match = locateTranscript(model, transcript);
    if (!match) {
      if (nudged) break;
      nudged = true;
      t = clampSecs(t + NOT_FOUND_NUDGE_SECS);
      continue;
    }

    // The clip starts at t, so what was heard begins at match.offset; shift t by the gap to the target.
    const gap = target - match.offset;
    const pointed = clampSecs(t + gap / charsPerSec);
    best = { positionSecs: pointed, score: match.score, transcript };
    if (Math.abs(gap) < CONVERGED_CHARS) break;
    t = pointed;
  }

  if (best) {
    return {
      position_secs: best.positionSecs,
      score: best.score,
      calls,
      transcript: best.transcript,
    };
  }
  return {
    ok: false,
    code: failedTranscription ? "transcription_failed" : "text_not_found",
  };
}

export const isHandoffFailure = (value: object): value is HandoffFailure =>
  "ok" in value && value.ok === false;
