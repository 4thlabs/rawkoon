import type { BookManifest, BookManifestChapter } from "@rawkoon/shared/types";
import type { Timeline } from "./timeline";
import type { FileIndex } from "./fileIndex";

export const PLAYBACK_RATES = [0.8, 1, 1.25, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export type LoadedBook = {
  editionId: number;
  bookId: number;
  title: string;
  authors: string[];
  coverUrl: string | null;
  manifest: BookManifest;
  timeline: Timeline;
  fileIndex: FileIndex;
};

export type PlayerContextValue = {
  loaded: boolean;
  editionId: number | null;
  bookId: number | null;
  title: string | null;
  authors: string[];
  coverUrl: string | null;
  chapters: BookManifestChapter[];
  currentChapterIndex: number | null;
  isPlaying: boolean;
  isLoading: boolean;
  positionSecs: number;
  durationSecs: number;
  rate: PlaybackRate;
  error: string | null;
  load: (editionId: number, bookId: number) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (positionSecs: number) => void;
  skip: (deltaSecs: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  setRate: (rate: PlaybackRate) => void;
  unload: () => void;
};
