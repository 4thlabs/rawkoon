import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const fetchApi = vi.fn();
vi.mock("@/lib/api/client", () => ({
  fetchApi: (...a: unknown[]) => fetchApi(...a),
}));

import { requireBooksEnabled } from "./useFeatures";

const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("requireBooksEnabled", () => {
  it("redirects home when books are off", async () => {
    fetchApi.mockResolvedValueOnce({ books_enabled: false });
    await expect(requireBooksEnabled(client())).rejects.toMatchObject({
      options: { to: "/" },
    });
  });

  it("resolves when books are on", async () => {
    fetchApi.mockResolvedValueOnce({ books_enabled: true });
    await expect(requireBooksEnabled(client())).resolves.toBeUndefined();
  });

  it("resolves when the flag fetch fails", async () => {
    fetchApi.mockRejectedValueOnce(new Error("network"));
    await expect(requireBooksEnabled(client())).resolves.toBeUndefined();
  });
});
