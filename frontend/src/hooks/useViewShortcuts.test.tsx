// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useViewShortcuts } from "./useViewShortcuts";

afterEach(cleanup);

type Options = Parameters<typeof useViewShortcuts>[0];

function Harness(props: Options) {
  useViewShortcuts(props);
  return <div>view</div>;
}

describe("useViewShortcuts", () => {
  // The bug this exists for: the shortcuts used to be bound to a non-focusable
  // <div>, so they only fired if focus already happened to be inside a field.
  // With focus on <body> — the state right after a view mounts — nothing worked.
  test("fires with focus on the body, not just inside a field", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    expect(document.activeElement).toBe(document.body);

    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test("fires while a field inside the view has focus", async () => {
    const onSubmit = vi.fn();
    render(
      <>
        <Harness onSubmit={onSubmit} />
        <input aria-label="answer" />
      </>
    );
    (document.querySelector("input") as HTMLElement).focus();

    await userEvent.keyboard("{Control>}{Enter}{/Control}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test("Escape runs the escape handler", async () => {
    const onEscape = vi.fn();
    render(<Harness onEscape={onEscape} />);

    await userEvent.keyboard("{Escape}");

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  test("bare Enter is left alone so textareas still work", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await userEvent.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("does nothing when disabled", async () => {
    const onSubmit = vi.fn();
    const onEscape = vi.fn();
    render(<Harness onSubmit={onSubmit} onEscape={onEscape} enabled={false} />);

    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    await userEvent.keyboard("{Escape}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onEscape).not.toHaveBeenCalled();
  });

  test("stops listening once the view unmounts", async () => {
    const onSubmit = vi.fn();
    const { unmount } = render(<Harness onSubmit={onSubmit} />);

    unmount();
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // The handlers live in a ref precisely so that a re-render with a fresh
  // closure doesn't leave the listener calling a stale one.
  test("calls the latest handler after a re-render", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Harness onSubmit={first} />);

    rerender(<Harness onSubmit={second} />);
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  test("an absent handler is a no-op, not a crash", async () => {
    render(<Harness />);

    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    await userEvent.keyboard("{Escape}");
  });
});
