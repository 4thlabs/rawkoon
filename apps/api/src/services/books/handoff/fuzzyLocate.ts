import {
  normalizeText,
  type EpubTextModel,
} from "@rawkoon/api/services/books/handoff/epubTextModel";

export interface LocateResult {
  /** Whole-book norm offset where the transcript begins. */
  offset: number;
  /** 0..1, one minus the edit distance over the needle length. */
  score: number;
  /** Normalized transcript length, for positioning inside the clip. */
  transcriptNormLength: number;
}

/** Below this the match is treated as not found. */
export const MIN_MATCH_SCORE = 0.6;

const NEEDLE_CHARS = 150;
/** Shorter than this is silence, music or a hallucinated one-liner. */
const MIN_NEEDLE_CHARS = 30;
const CANDIDATE_BUCKET = 32;
const MAX_CANDIDATES = 6;
const REFINE_MARGIN = 60;

function trigramIndex(model: EpubTextModel): Map<string, number[]> {
  if (model.trigramIndex) return model.trigramIndex;
  const index = new Map<string, number[]>();
  const text = model.norm;
  // Word starts in `text`; a trigram is the span of three consecutive words.
  const starts: number[] = [];
  const ends: number[] = [];
  const re = /\S+/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    starts.push(m.index);
    ends.push(m.index + m[0].length);
  }
  for (let i = 0; i + 2 < starts.length; i++) {
    const key = text.slice(starts[i], ends[i + 2]);
    const list = index.get(key);
    if (list) list.push(starts[i] as number);
    else index.set(key, [starts[i] as number]);
  }
  model.trigramIndex = index;
  return index;
}

/** Candidate needle starts, voted for by trigram hits that agree on the same diagonal. */
function candidateStarts(model: EpubTextModel, needle: string): number[] {
  const index = trigramIndex(model);
  const words = needle.split(" ");
  const votes = new Map<number, number>();
  let wordOffset = 0;
  for (let i = 0; i + 2 < words.length; i++) {
    const key = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    for (const pos of index.get(key) ?? []) {
      const bucket = Math.floor((pos - wordOffset) / CANDIDATE_BUCKET);
      votes.set(bucket, (votes.get(bucket) ?? 0) + 1);
    }
    wordOffset += (words[i] as string).length + 1;
  }
  return [...votes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CANDIDATES)
    .map(([bucket]) => bucket * CANDIDATE_BUCKET);
}

/**
 * Sellers' approximate matching: the cheapest edit script aligning the whole
 * needle to some substring of the window. Each cell carries where its alignment
 * began, so the start comes out with the distance and no traceback is needed.
 */
function bestAlignment(
  needle: string,
  haystack: string,
  windowStart: number,
  windowEnd: number,
): { distance: number; start: number } {
  const n = needle.length;
  const w = windowEnd - windowStart;
  let prevCost = new Int32Array(w + 1);
  let prevStart = new Int32Array(w + 1);
  for (let j = 0; j <= w; j++) prevStart[j] = j;
  let curCost = new Int32Array(w + 1);
  let curStart = new Int32Array(w + 1);

  for (let i = 1; i <= n; i++) {
    curCost[0] = i;
    curStart[0] = 0;
    const nc = needle.charCodeAt(i - 1);
    for (let j = 1; j <= w; j++) {
      const sub =
        (prevCost[j - 1] as number) +
        (nc === haystack.charCodeAt(windowStart + j - 1) ? 0 : 1);
      const del = (prevCost[j] as number) + 1;
      const ins = (curCost[j - 1] as number) + 1;
      if (sub <= del && sub <= ins) {
        curCost[j] = sub;
        curStart[j] = prevStart[j - 1] as number;
      } else if (del <= ins) {
        curCost[j] = del;
        curStart[j] = prevStart[j] as number;
      } else {
        curCost[j] = ins;
        curStart[j] = curStart[j - 1] as number;
      }
    }
    [prevCost, curCost] = [curCost, prevCost];
    [prevStart, curStart] = [curStart, prevStart];
  }

  let best = Number.POSITIVE_INFINITY;
  let bestStart = 0;
  for (let j = 1; j <= w; j++) {
    const cost = prevCost[j] as number;
    if (cost < best) {
      best = cost;
      bestStart = prevStart[j] as number;
    }
  }
  return { distance: best, start: windowStart + bestStart };
}

/** Finds where a transcript sits in the book text, or null when nothing is close enough. */
export function locateTranscript(
  model: EpubTextModel,
  transcript: string,
): LocateResult | null {
  const { norm: transcriptNorm } = normalizeText(transcript);
  if (transcriptNorm.length < MIN_NEEDLE_CHARS) return null;

  let needle = transcriptNorm.slice(0, NEEDLE_CHARS);
  // Drop a trailing partial word, which the clip boundary cut in half.
  const lastSpace = needle.lastIndexOf(" ");
  if (transcriptNorm.length > NEEDLE_CHARS && lastSpace > MIN_NEEDLE_CHARS) {
    needle = needle.slice(0, lastSpace);
  }

  let best: LocateResult | null = null;
  for (const candidate of candidateStarts(model, needle)) {
    const windowStart = Math.max(0, candidate - REFINE_MARGIN);
    const windowEnd = Math.min(
      model.norm.length,
      candidate + CANDIDATE_BUCKET + needle.length + REFINE_MARGIN,
    );
    if (windowEnd <= windowStart) continue;
    const { distance, start } = bestAlignment(
      needle,
      model.norm,
      windowStart,
      windowEnd,
    );
    const score = Math.max(0, 1 - distance / needle.length);
    if (!best || score > best.score) {
      best = {
        offset: start,
        score,
        transcriptNormLength: transcriptNorm.length,
      };
    }
  }
  return best && best.score >= MIN_MATCH_SCORE ? best : null;
}
