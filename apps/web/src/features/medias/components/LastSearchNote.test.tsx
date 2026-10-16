import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { hasStoredMiss, LastSearchNote } from "./LastSearchNote";

const miss = {
  status: "wanted" as const,
  last_search_outcome: "no_match" as const,
  last_search_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  last_search_reason: "No matching releases found",
};

describe("LastSearchNote", () => {
  it("shows a stored miss on a wanted item, with the reason as its tooltip", () => {
    render(<LastSearchNote item={miss} />);
    const note = screen.getByText(/library\.lastSearch\.noMatch/);
    expect(note.getAttribute("title")).toBe("No matching releases found");
  });

  it("stays out of the way for anything else", () => {
    expect(hasStoredMiss({ ...miss, status: "downloaded" })).toBe(false);
    expect(hasStoredMiss({ ...miss, last_search_outcome: "grabbed" })).toBe(
      false,
    );
    expect(hasStoredMiss({ ...miss, last_search_at: null })).toBe(false);
    const { container } = render(
      <LastSearchNote item={{ ...miss, last_search_outcome: null }} />,
    );
    expect(container.textContent).toBe("");
  });
});
