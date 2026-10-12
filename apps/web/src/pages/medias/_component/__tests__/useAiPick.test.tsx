import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FetcherProvider, type Fetcher } from "@/lib/api/context";
import {
  resolveAiTarget,
  aiPickQueryKey,
  type AiPickInput,
  useAiDismissal,
  useAiPick,
} from "@/pages/medias/_component/useAiPick";
import type { InteractiveReleaseItem } from "@rawkoon/shared/types";

const release = {
  guid: "g1",
  title: "Show.S02E05.1080p",
  rejected: false,
  size_bytes: 1,
  seeders: 2,
  quality_score: 3,
} as unknown as InteractiveReleaseItem;

function run(extra: { season?: number | null; episode?: number | null }) {
  const fetcher = vi.fn(async () => ({
    release_key: "g1",
    reasoning: "",
  })) as unknown as Fetcher;
  const client = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <FetcherProvider fetcher={fetcher}>{children}</FetcherProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useAiPick({
        enabled: true,
        releases: [release],
        mediaTitle: "Show",
        mediaYear: 2020,
        mediaType: "tv",
        libraryMediaId: 7,
        ...extra,
      }),
    { wrapper },
  );
  return { fetcher, hook };
}

describe("useAiPick", () => {
  it("sends the target season and episode in media_context", async () => {
    const { fetcher, hook } = run({ season: 2, episode: 5 });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    const call = (fetcher as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as unknown as [string, { body: { media_context: unknown } }];
    expect(call[1].body.media_context).toEqual({
      title: "Show",
      year: 2020,
      type: "tv",
      season: 2,
      episode: 5,
    });
  });

  it("sends a season pack as season with a null episode", async () => {
    const { fetcher, hook } = run({ season: 3, episode: null });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    const call = (fetcher as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as unknown as [string, { body: { media_context: unknown } }];
    expect(call[1].body.media_context).toMatchObject({
      season: 3,
      episode: null,
    });
  });

  it("omits season and episode when unknown", async () => {
    const { fetcher, hook } = run({});
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    const call = (fetcher as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as unknown as [string, { body: { media_context: object } }];
    expect(call[1].body.media_context).not.toHaveProperty("season");
  });
});

describe("resolveAiTarget", () => {
  const ep = { season: 2, episode: 5 };

  it("keeps the episode while the season is unchanged", () => {
    expect(resolveAiTarget(ep, null)).toEqual({ season: 2, episode: 5 });
    expect(resolveAiTarget(ep, 2)).toEqual({ season: 2, episode: 5 });
  });

  it("falls back to the picked season as a pack when the season changes", () => {
    expect(resolveAiTarget(ep, 3)).toEqual({ season: 3, episode: null });
  });

  it("targets nothing for the complete series", () => {
    expect(resolveAiTarget(ep, "complete")).toEqual({
      season: null,
      episode: null,
    });
  });

  it("uses the selected season when there is no episode target", () => {
    expect(resolveAiTarget(null, 4)).toEqual({ season: 4, episode: null });
  });
});

describe("useAiDismissal", () => {
  const input = (over: Partial<AiPickInput> = {}): AiPickInput => ({
    releases: [release],
    mediaTitle: "Show",
    mediaYear: 2020,
    mediaType: "tv",
    libraryMediaId: 7,
    season: 1,
    episode: null,
    ...over,
  });

  it("shows the suggestion again after switching target with identical results", () => {
    const { result, rerender } = renderHook(
      ({ season }: { season: number | null }) =>
        useAiDismissal(aiPickQueryKey(input({ season }))),
      { initialProps: { season: 1 as number | null } },
    );
    act(() => result.current.dismiss());
    expect(result.current.dismissed).toBe(true);
    rerender({ season: 2 });
    expect(result.current.dismissed).toBe(false);
  });

  it("stays dismissed when the same pick re-renders", () => {
    const { result, rerender } = renderHook(
      ({ n }: { n: number }) => {
        void n;
        return useAiDismissal(aiPickQueryKey(input()));
      },
      { initialProps: { n: 0 } },
    );
    act(() => result.current.dismiss());
    rerender({ n: 1 });
    expect(result.current.dismissed).toBe(true);
  });

  it("resets when the candidate set changes", () => {
    const other = { ...release, guid: "g2" } as InteractiveReleaseItem;
    const { result, rerender } = renderHook(
      ({ releases }: { releases: InteractiveReleaseItem[] }) =>
        useAiDismissal(aiPickQueryKey(input({ releases }))),
      { initialProps: { releases: [release] } },
    );
    act(() => result.current.dismiss());
    rerender({ releases: [release, other] });
    expect(result.current.dismissed).toBe(false);
  });

  it("resets when the media changes with identical results", () => {
    const { result, rerender } = renderHook(
      ({ mediaTitle }: { mediaTitle: string }) =>
        useAiDismissal(aiPickQueryKey(input({ mediaTitle }))),
      { initialProps: { mediaTitle: "Show" } },
    );
    act(() => result.current.dismiss());
    rerender({ mediaTitle: "Other Show" });
    expect(result.current.dismissed).toBe(false);
  });
});
