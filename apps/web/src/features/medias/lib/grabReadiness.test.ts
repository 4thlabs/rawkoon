import { describe, expect, it, vi } from "vitest";
import type { GrabReadinessCheck } from "@rawkoon/shared/types";
import {
  failingChecks,
  failingSignature,
  readDismissedSignature,
  writeDismissedSignature,
} from "./grabReadiness";

const check = (
  id: GrabReadinessCheck["id"],
  status: GrabReadinessCheck["status"],
): GrabReadinessCheck => ({ id, status, params: {} });

describe("grab readiness helpers", () => {
  it("keeps only warn and error checks", () => {
    const checks = [
      check("download_client", "ok"),
      check("rss_indexers", "warn"),
      check("indexer_manager", "error"),
    ];
    expect(failingChecks(checks).map((c) => c.id)).toEqual([
      "rss_indexers",
      "indexer_manager",
    ]);
    expect(failingChecks(undefined)).toEqual([]);
  });

  it("builds an order-independent signature that changes with the failing set", () => {
    const a = failingSignature([
      check("rss_indexers", "warn"),
      check("indexer_manager", "error"),
    ]);
    const b = failingSignature([
      check("indexer_manager", "error"),
      check("rss_indexers", "warn"),
    ]);
    expect(a).toBe(b);
    expect(failingSignature([check("rss_indexers", "warn")])).not.toBe(a);
    expect(failingSignature([check("rss_indexers", "ok")])).toBe("");
  });

  it("reads and writes the dismissed signature through localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValueOnce("rss_indexers:warn");
    expect(readDismissedSignature()).toBe("rss_indexers:warn");
    expect(readDismissedSignature()).toBeNull();
    writeDismissedSignature("x:warn");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "rawkoon.grabReadiness.dismissed",
      "x:warn",
    );
  });

  it("survives storage that throws", () => {
    vi.mocked(localStorage.getItem).mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(readDismissedSignature()).toBeNull();
    expect(() => writeDismissedSignature("x:warn")).not.toThrow();
  });
});
