// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Bank } from "../../types";

// BankDetail loads its own bank and reads the library context. Neither is what
// these tests are about — they're about what it hands to its callbacks.
vi.mock("../../api", () => ({
  api: { getBank: vi.fn(), deleteQuestion: vi.fn(), createSession: vi.fn() },
}));
vi.mock("../../context", () => ({
  useLibraryData: () => ({ getCategoryName: () => "Some category" }),
  useLibraryActions: () => ({ refreshBank: vi.fn() }),
}));

const { api } = await import("../../api");
const { BankDetail } = await import("./index");

const BANK: Bank = {
  id: "bank-1",
  subject: "Closures",
  bank_type: "theory",
  language: null,
  mastery: 40,
  questions: [
    {
      id: "q-1",
      subject: "What is a closure?",
      expected_answer: "A function plus its captured scope",
      grading_prompt: "Be strict about scope",
      mastery: 30,
      times_answered: 2,
      times_correct: 1,
    },
  ],
};

function renderBankDetail() {
  const props = {
    bankId: "bank-1",
    onBack: vi.fn(),
    onAddQuestion: vi.fn(),
    onEditQuestion: vi.fn(),
    onStartPractice: vi.fn(),
  };
  render(<BankDetail {...props} />);
  return props;
}

beforeEach(() => {
  vi.mocked(api.getBank).mockResolvedValue(BANK);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// These pin the callback *contract*, which is the thing that used to be
// positional: onEditQuestion took eight arguments, six of them adjacent
// strings, so swapping two was invisible to the compiler and to review.
describe("BankDetail callbacks", () => {
  test("onEditQuestion reports which bank and which question", async () => {
    const { onEditQuestion } = renderBankDetail();
    await waitFor(() => screen.getByTitle("Edit question"));

    await userEvent.click(screen.getByTitle("Edit question"));

    expect(onEditQuestion).toHaveBeenCalledWith(
      { id: "bank-1", subject: "Closures", type: "theory", language: null },
      {
        id: "q-1",
        subject: "What is a closure?",
        answer: "A function plus its captured scope",
        gradingPrompt: "Be strict about scope",
      }
    );
  });

  test("onEditQuestion sends an empty answer rather than undefined", async () => {
    vi.mocked(api.getBank).mockResolvedValue({
      ...BANK,
      questions: [{ ...BANK.questions![0], expected_answer: undefined }],
    });
    const { onEditQuestion } = renderBankDetail();
    await waitFor(() => screen.getByTitle("Edit question"));

    await userEvent.click(screen.getByTitle("Edit question"));

    expect(onEditQuestion.mock.calls[0][1].answer).toBe("");
  });

  test("onAddQuestion reports the bank", async () => {
    const { onAddQuestion } = renderBankDetail();
    await waitFor(() => screen.getByText("Add Question"));

    await userEvent.click(screen.getByText("Add Question"));

    expect(onAddQuestion).toHaveBeenCalledWith({
      id: "bank-1",
      subject: "Closures",
      type: "theory",
      language: null,
    });
  });
});
