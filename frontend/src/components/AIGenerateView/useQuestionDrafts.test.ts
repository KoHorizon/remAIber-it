// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useQuestionDrafts } from "./useQuestionDrafts";

afterEach(cleanup);

/** Two generated questions, as the API returns them: no ids yet. */
const GENERATED = [
  { subject: "What is a closure?", expected_answer: "A function plus scope" },
  { subject: "What is hoisting?", expected_answer: "Declarations move up" },
];

describe("useQuestionDrafts", () => {
  test("replaceAll gives every question an id of its own", () => {
    const { result } = renderHook(() => useQuestionDrafts());

    act(() => result.current.replaceAll(GENERATED));

    const [first, second] = result.current.questions;
    expect(first.id).not.toBe(second.id);
    expect(first.subject).toBe("What is a closure?");
  });

  test("add appends an empty draft and opens it for editing", () => {
    const { result } = renderHook(() => useQuestionDrafts());

    act(() => result.current.add());

    expect(result.current.questions).toHaveLength(1);
    expect(result.current.editingId).toBe(result.current.questions[0].id);
  });

  test("update changes one draft and leaves its siblings alone", () => {
    const { result } = renderHook(() => useQuestionDrafts());
    act(() => result.current.replaceAll(GENERATED));
    const target = result.current.questions[1].id;

    act(() => result.current.update(target, "subject", "Rewritten"));

    expect(result.current.questions[0].subject).toBe("What is a closure?");
    expect(result.current.questions[1].subject).toBe("Rewritten");
  });

  // The API distinguishes "no custom rules" (null) from an empty string, so
  // clearing the textarea has to write null rather than "".
  test("update stores a cleared grading prompt as null", () => {
    const { result } = renderHook(() => useQuestionDrafts());
    act(() => result.current.replaceAll(GENERATED));
    const target = result.current.questions[0].id;

    act(() => result.current.update(target, "grading_prompt", ""));

    expect(result.current.questions[0].grading_prompt).toBeNull();
  });

  test("remove closes the editor when it was editing the removed draft", () => {
    const { result } = renderHook(() => useQuestionDrafts());
    act(() => result.current.add());
    const target = result.current.questions[0].id;

    act(() => result.current.remove(target));

    expect(result.current.questions).toHaveLength(0);
    expect(result.current.editingId).toBeNull();
  });

  test("deleteSelected removes the selected drafts and leaves select mode", () => {
    const { result } = renderHook(() => useQuestionDrafts());
    act(() => result.current.replaceAll(GENERATED));
    const kept = result.current.questions[0].id;
    const doomed = result.current.questions[1].id;

    act(() => result.current.enterSelectMode());
    act(() => result.current.toggleSelect(doomed));
    act(() => result.current.deleteSelected());

    expect(result.current.questions.map((q) => q.id)).toEqual([kept]);
    expect(result.current.selectMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  // A part-way save leaves some drafts written to the bank and some not. The
  // written ones are dropped, so pressing Save again can't duplicate them —
  // and they must also leave the selection, which is keyed by the same ids.
  test("keepUnsaved drops the saved drafts from the list and the selection", () => {
    const { result } = renderHook(() => useQuestionDrafts());
    act(() => result.current.replaceAll(GENERATED));
    const saved = result.current.questions[0];
    const remaining = result.current.questions.slice(1);

    act(() => result.current.enterSelectMode());
    act(() => result.current.toggleSelect(saved.id));
    act(() => result.current.keepUnsaved(remaining, new Set([saved.id])));

    expect(result.current.questions).toEqual(remaining);
    expect(result.current.selectedIds.has(saved.id)).toBe(false);
  });
});
