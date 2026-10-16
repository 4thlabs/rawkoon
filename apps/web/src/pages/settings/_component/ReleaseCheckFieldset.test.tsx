import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReleaseCheckFieldset } from "./ReleaseCheckFieldset";

// The test i18n mock renders `key schedule:<value>` for interpolated strings.
const P = "settings.mediaLibrary.releaseCheck";
const summary = (schedule: string) => `${P}.summary schedule:${schedule}`;

describe("ReleaseCheckFieldset", () => {
  it("shows the stored preset in plain words", () => {
    render(
      <ReleaseCheckFieldset initialCron="0 */6 * * *" onChange={vi.fn()} />,
    );
    expect(
      screen.getByLabelText(new RegExp(`${P}.presets.every6h`)),
    ).toBeChecked();
    expect(screen.getByText(summary("every 6 hours"))).toBeInTheDocument();
  });

  it("emits the preset's cron when another preset is picked", () => {
    const onChange = vi.fn();
    render(
      <ReleaseCheckFieldset initialCron="0 */6 * * *" onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText(`${P}.presets.every3h`));
    expect(onChange).toHaveBeenLastCalledWith({
      cron: "0 */3 * * *",
      valid: true,
    });
    expect(screen.getByText(summary("every 3 hours"))).toBeInTheDocument();
  });

  it("builds a daily cron from the time input", () => {
    const onChange = vi.fn();
    render(
      <ReleaseCheckFieldset initialCron="0 */6 * * *" onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText(`${P}.timeLabel`), {
      target: { value: "04:30" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      cron: "30 4 * * *",
      valid: true,
    });
    expect(
      screen.getByText(summary("every day at 4:30 AM")),
    ).toBeInTheDocument();
  });

  it("opens on a daily preset when the stored cron is a daily time", () => {
    render(
      <ReleaseCheckFieldset initialCron="15 2 * * *" onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText(`${P}.timeLabel`)).toHaveValue("02:15");
  });

  it("flags an impossible date and an interval under 15 minutes", () => {
    const onChange = vi.fn();
    render(
      <ReleaseCheckFieldset initialCron="0 */4 * * *" onChange={onChange} />,
    );
    const input = screen.getByLabelText(`${P}.customLabel`);

    fireEvent.change(input, { target: { value: "0 0 31 2 *" } });
    expect(onChange).toHaveBeenLastCalledWith({
      cron: "0 0 31 2 *",
      valid: false,
    });
    expect(screen.getByRole("alert")).toHaveTextContent(`${P}.invalidCron`);

    fireEvent.change(input, { target: { value: "*/5 * * * *" } });
    expect(onChange).toHaveBeenLastCalledWith({
      cron: "*/5 * * * *",
      valid: false,
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      `${P}.tooFrequent minutes:15`,
    );
  });

  it("previews a custom cron and flags an invalid one", () => {
    const onChange = vi.fn();
    render(
      <ReleaseCheckFieldset initialCron="0 */4 * * *" onChange={onChange} />,
    );
    const input = screen.getByLabelText(`${P}.customLabel`);
    expect(screen.getByText(summary("every 4 hours"))).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "0 25 * * *" } });
    expect(onChange).toHaveBeenLastCalledWith({
      cron: "0 25 * * *",
      valid: false,
    });
    expect(screen.getByRole("alert")).toHaveTextContent(`${P}.invalidCron`);

    fireEvent.change(input, { target: { value: "0 9 * * 1-5" } });
    expect(onChange).toHaveBeenLastCalledWith({
      cron: "0 9 * * 1-5",
      valid: true,
    });
    expect(
      screen.getByText(summary("every weekday at 9:00 AM")),
    ).toBeInTheDocument();
  });
});
