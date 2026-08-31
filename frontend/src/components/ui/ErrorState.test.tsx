// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "./ErrorState";

afterEach(cleanup);

describe("ErrorState", () => {
  // The whole point of this component is that the backend's message reaches the
  // user verbatim — the bug it was built for was messages dying in the context.
  test("shows the message it was given", () => {
    render(<ErrorState message="name is required" />);

    expect(screen.getByRole("alert").textContent).toContain("name is required");
  });

  test("is announced to screen readers as an alert", () => {
    render(<ErrorState message="boom" />);

    expect(screen.getByRole("alert")).toBeTruthy();
  });

  test("uses a default title, overridable", () => {
    const { unmount } = render(<ErrorState message="boom" />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    unmount();

    render(<ErrorState message="boom" title="Could not load library" />);
    expect(screen.getByText("Could not load library")).toBeTruthy();
  });

  test("offers no retry button unless onRetry is given", () => {
    render(<ErrorState message="boom" />);

    expect(screen.queryByText("Try again")).toBeNull();
  });

  test("calls onRetry when the retry button is pressed", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="boom" onRetry={onRetry} />);

    await userEvent.click(screen.getByText("Try again"));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
