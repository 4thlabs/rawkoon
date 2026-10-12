import { describe, expect, it } from "vitest";
import { formatBytes } from "./format";

// Expected strings are what the iOS app shows: ByteCountFormatter with the
// .file count style, captured on macOS. French uses the decimal comma and
// French unit symbols.
describe("formatBytes", () => {
  it.each([
    [0, "Zero KB"],
    [1, "1 byte"],
    [999, "999 bytes"],
    [1000, "1 KB"],
    [1500, "2 KB"],
    [999_999, "1 MB"],
    [1_234_567, "1.2 MB"],
    [12_345_678, "12.3 MB"],
    [123_456_789, "123.5 MB"],
    [999_999_999, "1 GB"],
    [1_234_567_890, "1.23 GB"],
    [42_200_000_000, "42.2 GB"],
    [62_000_000_000, "62 GB"],
    [99_950_000_000, "99.95 GB"],
    [123_456_789_012, "123.46 GB"],
    [350_600_000_000, "350.6 GB"],
    [1_000_000_000_000, "1 TB"],
    [7_970_000_000_000, "7.97 TB"],
    [12_345_678_901_234, "12.35 TB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatBytes(bytes, "en")).toBe(expected);
  });

  it.each([
    [0, "Zéro Ko"],
    [1, "1 octet"],
    [999, "999 octets"],
    [1_234_567, "1,2 Mo"],
    [42_200_000_000, "42,2 Go"],
    [62_000_000_000, "62 Go"],
    [7_970_000_000_000, "7,97 To"],
  ])("formats %d bytes in French as %s", (bytes, expected) => {
    expect(formatBytes(bytes, "fr")).toBe(expected);
  });

  it("treats missing or invalid sizes as zero", () => {
    expect(formatBytes(null, "en")).toBe("Zero KB");
    expect(formatBytes(Number.NaN, "en")).toBe("Zero KB");
  });
});
