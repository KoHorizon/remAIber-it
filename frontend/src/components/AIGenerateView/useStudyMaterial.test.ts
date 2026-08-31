// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useStudyMaterial } from "./useStudyMaterial";

afterEach(cleanup);

/** Opens the editor with no item, types `text`, saves. */
function addItem(result: { current: ReturnType<typeof useStudyMaterial> }, text: string) {
  act(() => result.current.openEditor());
  act(() => result.current.setDraft(text));
  act(() => result.current.saveDraft());
}

describe("useStudyMaterial", () => {
  test("saving with no item open appends a block", () => {
    const { result } = renderHook(() => useStudyMaterial());

    addItem(result, "  Closures capture scope.  ");

    expect(result.current.items.map((i) => i.text)).toEqual([
      "Closures capture scope.",
    ]);
  });

  test("opening an existing item edits it in place", () => {
    const { result } = renderHook(() => useStudyMaterial());
    addItem(result, "First");
    addItem(result, "Second");
    const target = result.current.items[0];

    act(() => result.current.openEditor(target));
    act(() => result.current.setDraft("Rewritten"));
    act(() => result.current.saveDraft());

    expect(result.current.items.map((i) => i.text)).toEqual([
      "Rewritten",
      "Second",
    ]);
  });

  // The blocks are sent to the model as one prompt, separated so it can tell
  // where one source ends and the next begins.
  test("combinedContent joins the blocks with a separator", () => {
    const { result } = renderHook(() => useStudyMaterial());
    addItem(result, "First");
    addItem(result, "Second");

    expect(result.current.combinedContent).toBe("First\n\n---\n\nSecond");
  });

  test("remove deletes by id, not by position", () => {
    const { result } = renderHook(() => useStudyMaterial());
    addItem(result, "First");
    addItem(result, "Second");
    addItem(result, "Third");
    const target = result.current.items[1].id;

    act(() => result.current.remove(target));

    expect(result.current.items.map((i) => i.text)).toEqual(["First", "Third"]);
  });

  test("a blank draft is not saved", () => {
    const { result } = renderHook(() => useStudyMaterial());

    addItem(result, "   ");

    expect(result.current.items).toHaveLength(0);
  });
});
