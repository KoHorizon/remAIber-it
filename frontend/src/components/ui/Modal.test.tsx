// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

afterEach(cleanup);

describe("Modal", () => {
  test("closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Confirm" onClose={onClose}>
        body
      </Modal>
    );

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The bug this pins: views register their own document-level Escape handler
  // (useViewShortcuts) that navigates the whole view away. If Escape reaches it
  // while a modal is open, the view unmounts and the modal goes with it.
  test("does not let Escape reach document listeners underneath it", async () => {
    const viewHandler = vi.fn();
    document.addEventListener("keydown", viewHandler);

    try {
      render(
        <Modal title="Confirm" onClose={() => {}}>
          body
        </Modal>
      );

      await userEvent.keyboard("{Escape}");

      expect(viewHandler).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", viewHandler);
    }
  });

  test("lets other keys through to document listeners", async () => {
    const viewHandler = vi.fn();
    document.addEventListener("keydown", viewHandler);

    try {
      render(
        <Modal title="Confirm" onClose={() => {}}>
          body
        </Modal>
      );

      await userEvent.keyboard("{Enter}");

      expect(viewHandler).toHaveBeenCalled();
    } finally {
      document.removeEventListener("keydown", viewHandler);
    }
  });

  test("Escape closes only the topmost of two stacked modals", async () => {
    const closeOuter = vi.fn();
    const closeInner = vi.fn();
    render(
      <>
        <Modal title="Outer" onClose={closeOuter}>
          outer
        </Modal>
        <Modal title="Inner" onClose={closeInner}>
          inner
        </Modal>
      </>
    );

    await userEvent.keyboard("{Escape}");

    expect(closeInner).toHaveBeenCalledTimes(1);
    expect(closeOuter).not.toHaveBeenCalled();
  });

  test("is announced as a modal dialog labelled by its title", () => {
    render(
      <Modal title="Delete folder" onClose={() => {}}>
        body
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    // Labelled by the heading rather than aria-label, so the accessible name
    // cannot drift from the visible title.
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe("Delete folder");
  });

  test("moves focus into the dialog on open", () => {
    render(
      <Modal title="Confirm" onClose={() => {}}>
        <input aria-label="name" />
      </Modal>
    );

    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  test("restores focus to the trigger on close", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <Modal title="Confirm" onClose={() => {}}>
        body
      </Modal>
    );
    expect(document.activeElement).not.toBe(trigger);

    unmount();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  test("Tab wraps from the last focusable back to the first", async () => {
    render(
      <Modal title="Confirm" onClose={() => {}} actions={<button>Save</button>}>
        <input aria-label="first" />
      </Modal>
    );

    const close = screen.getByLabelText("Close");
    const first = screen.getByLabelText("first");
    const save = screen.getByText("Save");

    save.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(close);

    // ...and Shift+Tab off the first goes to the last, not out of the dialog.
    first.focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(close);
    close.focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(save);
  });

  test("closes on overlay click but not on a click inside the dialog", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Confirm" onClose={onClose}>
        <span>body text</span>
      </Modal>
    );

    await userEvent.click(screen.getByText("body text"));
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(document.querySelector(".modal-overlay")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
