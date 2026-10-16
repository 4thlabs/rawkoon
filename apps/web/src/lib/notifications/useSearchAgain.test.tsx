import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FetcherProvider } from "@/lib/api/context";
import type { ReactNode } from "react";
import { useSearchAgain } from "@/lib/notifications/useSearchAgain";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const fetcher = vi.fn();
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return (
    <FetcherProvider fetcher={fetcher}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </FetcherProvider>
  );
}

describe("useSearchAgain", () => {
  beforeEach(() => {
    fetcher.mockReset();
    toast.mockReset();
    toast.error.mockReset();
  });

  it("searches the whole title when there is no season", async () => {
    fetcher.mockResolvedValue({ grabbed: false });
    const { result } = renderHook(() => useSearchAgain(), { wrapper });
    act(() =>
      result.current.mutate({ mediaId: 7, season: null, episode: null }),
    );
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(fetcher).toHaveBeenCalledWith("/api/library/7/search", {
      method: "POST",
      body: {},
    });
    expect(toast).toHaveBeenCalledWith("notifications.searchAgainNothingTitle");
  });

  it("searches the season pack at season scope", async () => {
    fetcher.mockResolvedValue({ grabbed: true });
    const { result } = renderHook(() => useSearchAgain(), { wrapper });
    act(() => result.current.mutate({ mediaId: 7, season: 2, episode: null }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][0]).toBe("/api/library/7/seasons/2/search");
    expect(toast).toHaveBeenCalledWith("notifications.searchAgainGrabbed");
  });

  it("looks the episode up, then searches it", async () => {
    fetcher.mockImplementation((url: string) =>
      url.endsWith("/episodes")
        ? Promise.resolve({
            seasons: [
              { season: 2, episodes: [{ id: 99, season: 2, episode: 5 }] },
            ],
          })
        : Promise.resolve({ grabbed: false }),
    );
    const { result } = renderHook(() => useSearchAgain(), { wrapper });
    act(() => result.current.mutate({ mediaId: 7, season: 2, episode: 5 }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
      "/api/library/7/episodes",
      "/api/library/7/episodes/99/search",
    ]);
  });

  it("reports an error when the episode no longer exists", async () => {
    fetcher.mockResolvedValue({ seasons: [] });
    const { result } = renderHook(() => useSearchAgain(), { wrapper });
    act(() => result.current.mutate({ mediaId: 7, season: 2, episode: 5 }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
