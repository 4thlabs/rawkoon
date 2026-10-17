import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const update = vi.fn(async (_b: Record<string, unknown>) => ({}));
let version = "v1";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/Loader", () => ({ Loader: () => null }));
vi.mock("@/features/medias/hooks/useMediaPostProcessingSettings", () => ({
  useMediaPostProcessingSettings: () => ({
    isLoading: false,
    data: {
      settings: {
        min_seed_ratio: 1,
        public_seed_time_mins: null,
        private_seed_ratio: 1,
        private_seed_time_mins: null,
        seed_sweep_enabled: false,
        file_operation: "hardlink",
        blocked_extensions: [],
        min_free_space_gb: 10,
        updated_at: version,
      },
    },
  }),
}));
vi.mock("@/features/medias/hooks/useUpdateMediaPostProcessingSettings", () => ({
  useUpdateMediaPostProcessingSettings: () => ({
    mutateAsync: update,
    isPending: false,
  }),
}));
vi.mock("@/features/seeding/hooks/useSeeding", () => ({
  useSeeding: () => ({
    data: {
      enabled: false,
      torrents: [],
      would_release_now: { count: 0, bytes: 0 },
    },
  }),
}));
vi.mock("@/features/seeding/hooks/useSeedRules", () => ({
  useSeedRules: () => ({ data: { indexers: [] } }),
  useUpsertSeedRule: () => ({ mutateAsync: vi.fn() }),
  useDeleteSeedRule: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/features/seeding/hooks/useJanitorStats", () => ({
  useJanitorStats: () => ({ data: undefined }),
}));
vi.mock("@/pages/settings/_component/ExtensionChipInput", () => ({
  ExtensionChipInput: () => <div />,
}));

import { AfterDownloadPage } from "./AfterDownloadPage";

describe("AfterDownloadPage", () => {
  it("keeps unsaved seeding edits when the safety section is saved", async () => {
    const { rerender } = render(<AfterDownloadPage />);
    const ratio = screen.getAllByLabelText("settings.seeding.ratio")[0];
    fireEvent.change(ratio, { target: { value: "3" } });

    fireEvent.click(screen.getByText("settings.downloadSafety.save"));
    await waitFor(() => expect(update).toHaveBeenCalled());
    version = "v2";
    rerender(<AfterDownloadPage />);

    expect(
      (
        screen.getAllByLabelText(
          "settings.seeding.ratio",
        )[0] as HTMLInputElement
      ).value,
    ).toBe("3");
  });
});
