import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { FetcherProvider, type Fetcher } from "@/lib/api/context";
import { resetLiveSearchToasts } from "../lib/liveSearchToast";
import { useLiveSearchToast } from "./useLiveSearchToast";

const { toast } = vi.hoisted(() => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

afterEach(() => {
  resetLiveSearchToasts();
  Object.values(toast).forEach((fn) => fn.mockClear());
});

function setup(fetcher: Fetcher) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <FetcherProvider fetcher={fetcher}>{children}</FetcherProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useLiveSearchToast(), { wrapper });
}

const search = (isShow: boolean) => ({
  mediaId: 7,
  title: "T",
  profileName: "HD",
  isShow,
});

describe("Grab now on a held search", () => {
  it.each([
    ["a movie", false, undefined, "m:7"],
    ["a show season", true, 2, "s:7:2"],
    ["a show-level target", true, undefined, "m:7"],
  ])("grabs %s by the held target's key", async (_n, isShow, season, key) => {
    const fetcher = vi.fn().mockResolvedValue({ grabbed: true, reason: null });
    const { result } = setup(fetcher as unknown as Fetcher);
    act(() => {
      result.current.announceSearch(search(isShow), async () => ({
        grabbed: false,
        search_result: {
          media_id: 7,
          ...(season != null ? { season } : {}),
          outcome: "delayed" as const,
          target_key: key,
        },
      }));
    });
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    const options = toast.info.mock.calls[0]![1] as {
      action: { onClick: (e: { preventDefault: () => void }) => void };
    };
    act(() => options.action.onClick({ preventDefault: () => {} }));

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/downloads/pending-releases/grab-now",
        { method: "POST", body: { target_key: key } },
      ),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("releases every held target of a show", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ grabbed: false, reason: "already_active" })
      .mockResolvedValueOnce({ grabbed: true, reason: null });
    const { result } = setup(fetcher as unknown as Fetcher);
    act(() => {
      result.current.announceSearch(search(true), async () => ({
        grabbed: false,
        search_result: {
          media_id: 7,
          outcome: "delayed" as const,
          target_key: "s:7:1",
          target_keys: ["s:7:1", "s:7:2"],
        },
      }));
    });
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    const options = toast.info.mock.calls[0]![1] as {
      action: { onClick: (e: { preventDefault: () => void }) => void };
    };
    act(() => options.action.onClick({ preventDefault: () => {} }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/downloads/pending-releases/grab-now",
      { method: "POST", body: { target_key: "s:7:2" } },
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("shows why nothing was grabbed", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ grabbed: false, reason: "already_active" });
    const { result } = setup(fetcher as unknown as Fetcher);
    act(() => {
      result.current.announceSearch(search(false), async () => ({
        grabbed: false,
        search_result: {
          media_id: 7,
          outcome: "delayed" as const,
          target_key: "m:7",
        },
      }));
    });
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    const options = toast.info.mock.calls[0]![1] as {
      action: { onClick: (e: { preventDefault: () => void }) => void };
    };
    act(() => options.action.onClick({ preventDefault: () => {} }));
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        "dashboard.home.nothingGrabbed",
        expect.objectContaining({
          description: "dashboard.home.grabMiss.already_active",
        }),
      ),
    );
  });
});
