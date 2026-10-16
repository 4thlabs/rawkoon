import { describe, expect, it } from "bun:test";
import { estimateEtaSeconds } from "@rawkoon/api/services/downloadClient/eta";

describe("estimateEtaSeconds", () => {
  it("divides the remaining bytes by the current speed", () => {
    expect(
      estimateEtaSeconds({ progress: 0.5, sizeBytes: 1_000, dlSpeed: 50 }),
    ).toBe(10);
  });

  it("is null when nothing is moving or the size is unknown", () => {
    expect(
      estimateEtaSeconds({ progress: 0.5, sizeBytes: 1_000, dlSpeed: 0 }),
    ).toBeNull();
    expect(
      estimateEtaSeconds({ progress: 0.5, sizeBytes: 0, dlSpeed: 50 }),
    ).toBeNull();
  });

  it("never goes negative past full progress", () => {
    expect(
      estimateEtaSeconds({ progress: 1.2, sizeBytes: 1_000, dlSpeed: 50 }),
    ).toBe(0);
  });
});
