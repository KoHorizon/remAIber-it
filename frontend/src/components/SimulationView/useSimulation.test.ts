// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { getDefaultRules } from "../../utils/gradingTemplates";

vi.mock("../../api", () => ({ api: { simulateGrade: vi.fn() } }));

const { api } = await import("../../api");
const { useSimulation } = await import("./useSimulation");

const RESULT = { score: 80, covered: ["scope"], missed: [] };

beforeEach(() => {
  vi.mocked(api.simulateGrade).mockResolvedValue(RESULT);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Fills the three required fields so grading is possible. */
function fill(result: { current: { setQuestion: (v: string) => void; setExpectedAnswer: (v: string) => void; setTestAnswer: (v: string) => void } }) {
  act(() => result.current.setQuestion("  What is a closure?  "));
  act(() => result.current.setExpectedAnswer("  A function plus scope  "));
  act(() => result.current.setTestAnswer("  a func with its scope  "));
}

describe("useSimulation", () => {
  test("all three fields must have content before grading", () => {
    const { result } = renderHook(() => useSimulation());

    expect(result.current.canGrade).toBe(false);
    act(() => result.current.setQuestion("Q"));
    act(() => result.current.setExpectedAnswer("A"));
    expect(result.current.canGrade).toBe(false);
    act(() => result.current.setTestAnswer("   "));
    expect(result.current.canGrade).toBe(false);
    act(() => result.current.setTestAnswer("T"));
    expect(result.current.canGrade).toBe(true);
  });

  test("grading sends the trimmed fields", async () => {
    const { result } = renderHook(() => useSimulation());
    fill(result);

    await act(() => result.current.grade());

    expect(api.simulateGrade).toHaveBeenCalledWith({
      question: "What is a closure?",
      expected_answer: "A function plus scope",
      user_answer: "a func with its scope",
      bank_type: "theory",
      grading_prompt: getDefaultRules("theory"),
    });
    expect(result.current.gradeResult).toEqual(RESULT);
  });

  // Empty rules mean "let the backend use its own", which it signals with null
  // rather than an empty string.
  test("cleared rules are sent as null", async () => {
    const { result } = renderHook(() => useSimulation());
    fill(result);
    act(() => result.current.setGradingPrompt("   "));

    await act(() => result.current.grade());

    expect(vi.mocked(api.simulateGrade).mock.calls[0][0].grading_prompt).toBeNull();
  });

  test("a failed grade reports the message and shows no score", async () => {
    vi.mocked(api.simulateGrade).mockRejectedValue(new Error("model offline"));
    const { result } = renderHook(() => useSimulation());
    fill(result);

    await act(() => result.current.grade());

    expect(result.current.gradeError).toBe("model offline");
    expect(result.current.gradeResult).toBeNull();
  });

  // The score describes one specific answer. Editing any input makes it stale,
  // so it goes away rather than sitting there looking current.
  test("editing an input clears the previous result", async () => {
    const { result } = renderHook(() => useSimulation());
    fill(result);
    await act(() => result.current.grade());
    expect(result.current.gradeResult).toEqual(RESULT);

    act(() => result.current.setTestAnswer("a different answer"));

    expect(result.current.gradeResult).toBeNull();
  });

  test("changing the bank type loads that type's default rules", () => {
    const { result } = renderHook(() => useSimulation());
    act(() => result.current.setGradingPrompt("my own rules"));

    act(() => result.current.setBankType("cli"));

    expect(result.current.gradingPrompt).toBe(getDefaultRules("cli"));
  });

  test("changing the bank type clears a stale error", async () => {
    vi.mocked(api.simulateGrade).mockRejectedValue(new Error("model offline"));
    const { result } = renderHook(() => useSimulation());
    fill(result);
    await act(() => result.current.grade());

    act(() => result.current.setBankType("code"));

    expect(result.current.gradeError).toBeNull();
  });

  test("the rules panel is closed until it is asked for", () => {
    const { result } = renderHook(() => useSimulation());

    expect(result.current.isRulesOpen).toBe(false);
    act(() => result.current.toggleRules());
    expect(result.current.isRulesOpen).toBe(true);
    act(() => result.current.toggleRules());
    expect(result.current.isRulesOpen).toBe(false);
  });

  test("reset empties the fields and restores the default rules", async () => {
    const { result } = renderHook(() => useSimulation());
    fill(result);
    act(() => result.current.toggleRules());
    await act(() => result.current.grade());

    act(() => result.current.reset());

    expect(result.current.question).toBe("");
    expect(result.current.expectedAnswer).toBe("");
    expect(result.current.testAnswer).toBe("");
    expect(result.current.gradeResult).toBeNull();
    expect(result.current.gradingPrompt).toBe(getDefaultRules("theory"));
    expect(result.current.isRulesOpen).toBe(false);
  });
});
