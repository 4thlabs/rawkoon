import { describe, expect, it } from "vitest";
import { centerAspectCrop } from "./avatarCrop";

describe("centerAspectCrop", () => {
  it("returns a centered 90% square crop for a square image", () => {
    const crop = centerAspectCrop(200, 200, 1);
    expect(crop.unit).toBe("%");
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(90);
    expect(crop.x).toBe(5);
    expect(crop.y).toBe(5);
  });

  it("keeps a square pixel aspect on a wide image", () => {
    const crop = centerAspectCrop(400, 200, 1);
    expect(crop.unit).toBe("%");
    expect((crop.width / 100) * 400).toBeCloseTo((crop.height / 100) * 200);
    expect(crop.x + crop.width / 2).toBeCloseTo(50);
    expect(crop.y + crop.height / 2).toBeCloseTo(50);
  });
});
