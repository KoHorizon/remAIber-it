// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { SimulateGradeResult } from "../../api";
import type { BankType } from "../../types";

vi.mock("../../api", () => ({ api: { addQuestion: vi.fn() } }));

const bank = (id: string, bankType: BankType, categoryId: string | null) => ({
  id,
  subject: id,
  bank_type: bankType,
  category_id: categoryId,
  mastery: 0,
});

const BANKS = [
  bank("t-none", "theory", null),
  bank("t-js", "theory", "js"),
  bank("c-js", "code", "js"),
  bank("t-go", "theory", "go"),
];

vi.mock("../../context", () => ({
  useLibraryData: () => ({
    banks: BANKS,
    categories: [
      { id: "js", name: "JavaScript" },
      { id: "go", name: "Go" },
    ],
  }),
}));

const { api } = await import("../../api");
const { useSaveToBank } = await import("./useSaveToBank");

const RESULT: SimulateGradeResult = { score: 80, covered: [], missed: [] };
const OTHER_RESULT: SimulateGradeResult = { score: 40, covered: [], missed: [] };

type Params = Parameters<typeof useSaveToBank>[0];

const BASE: Params = {
  gradeResult: null,
  bankType: "theory",
  question: "  What is a closure?  ",
  expectedAnswer: "  A function plus scope  ",
  gradingPrompt: "  be strict  ",
  onSaved: () => {},
};

/** Renders the hook with `BASE` overridden, and exposes a typed rerender. */
function renderSave(overrides: Partial<Params> = {}) {
  const { result, rerender } = renderHook(
    (props: Params) => useSaveToBank(props),
    { initialProps: { ...BASE, ...overrides } }
  );
  return {
    result,
    update: (next: Partial<Params>) =>
      rerender({ ...BASE, ...overrides, ...next }),
  };
}

beforeEach(() => {
  vi.mocked(api.addQuestion).mockResolvedValue({
    id: "q1",
    subject: "What is a closure?",
    mastery: 0,
    times_answered: 0,
    times_correct: 0,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useSaveToBank", () => {
  // A theory question has nowhere to go in a code bank, and the picker is
  // scoped to one category at a time.
  test("only offers banks of the graded type in the chosen category", () => {
    const { result } = renderSave({ bankType: "theory" });

    act(() => result.current.selectCategory("js"));

    expect(result.current.matchingBanks.map((b) => b.id)).toEqual(["t-js"]);
  });

  // "No category" is a real place banks live, not an absence of filter.
  test("no category selected means the uncategorised banks", () => {
    const { result } = renderSave({ bankType: "theory" });

    expect(result.current.matchingBanks.map((b) => b.id)).toEqual(["t-none"]);
  });

  test("changing category drops a bank that is no longer offered", () => {
    const { result } = renderSave();
    act(() => result.current.selectCategory("js"));
    act(() => result.current.selectBank("t-js"));

    act(() => result.current.selectCategory("go"));

    expect(result.current.selectedBankId).toBeNull();
  });

  test("changing bank type drops the selected bank", () => {
    const { result, update } = renderSave();
    act(() => result.current.selectCategory("js"));
    act(() => result.current.selectBank("t-js"));

    act(() => update({ bankType: "code" as BankType }));

    expect(result.current.selectedBankId).toBeNull();
  });

  test("saving needs both a graded result and somewhere to put it", () => {
    const { result, update } = renderSave();
    act(() => result.current.selectCategory("js"));
    act(() => result.current.selectBank("t-js"));
    expect(result.current.canSave).toBe(false);

    act(() => update({ gradeResult: RESULT }));

    expect(result.current.canSave).toBe(true);
  });

  // The save panel is opened from a specific score card. A regrade produces a
  // different result, so the panel belongs to something that is no longer on
  // screen and has to close — previously an effect did this a render late.
  test("the save panel closes when a new grade replaces the old one", () => {
    const { result, update } = renderSave({ gradeResult: RESULT });
    act(() => result.current.openSaveView());
    expect(result.current.isSaveViewOpen).toBe(true);

    act(() => update({ gradeResult: OTHER_RESULT }));

    expect(result.current.isSaveViewOpen).toBe(false);
  });

  test("the save panel closes when the result is cleared", () => {
    const { result, update } = renderSave({ gradeResult: RESULT });
    act(() => result.current.openSaveView());

    act(() => update({ gradeResult: null }));

    expect(result.current.isSaveViewOpen).toBe(false);
  });

  test("saving writes the trimmed question to the chosen bank", async () => {
    const { result } = renderSave({ gradeResult: RESULT });
    act(() => result.current.selectCategory("js"));
    act(() => result.current.selectBank("t-js"));

    await act(() => result.current.save());

    expect(api.addQuestion).toHaveBeenCalledWith(
      "t-js",
      "What is a closure?",
      "A function plus scope",
      "be strict"
    );
  });

  test("empty rules are saved as null", async () => {
    const { result } = renderSave({ gradeResult: RESULT, gradingPrompt: "   " });
    act(() => result.current.selectCategory("js"));
    act(() => result.current.selectBank("t-js"));

    await act(() => result.current.save());

    expect(vi.mocked(api.addQuestion).mock.calls[0][3]).toBeNull();
  });

  // The card slides away before the inputs are wiped, so the reset can't
  // happen until the animation has run — otherwise the card empties on screen.
  test("the inputs are only cleared once the card has slid away", async () => {
    vi.useFakeTimers();
    const onSaved = vi.fn();
    const { result } = renderSave({ gradeResult: RESULT, onSaved });
    act(() => result.current.selectCategory("js"));
    act(() => result.current.selectBank("t-js"));

    await act(() => result.current.save());

    expect(result.current.isClosingResult).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();

    act(() => void vi.runAllTimers());

    expect(result.current.isClosingResult).toBe(false);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  test("a failed save leaves the question where it is", async () => {
    const onSaved = vi.fn();
    vi.mocked(api.addQuestion).mockRejectedValue(new Error("bank is gone"));
    const { result } = renderSave({ gradeResult: RESULT, onSaved });
    act(() => result.current.selectCategory("js"));
    act(() => result.current.selectBank("t-js"));

    await act(() => result.current.save());

    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isClosingResult).toBe(false);
  });
});
