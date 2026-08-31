// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../api", () => ({
  api: {
    getBanks: vi.fn(),
    generateQuestions: vi.fn(),
    addQuestion: vi.fn(),
  },
}));

// Monaco and the terminal emulator are irrelevant here and expensive to boot.
vi.mock("../CodeEditor", () => ({ CodeEditor: () => null }));
vi.mock("../TerminalEditor", () => ({ TerminalEditor: () => null }));

const { api } = await import("../../api");
const { AIGenerateView } = await import("./index");

beforeEach(() => {
  vi.mocked(api.getBanks).mockResolvedValue([]);
  vi.mocked(api.generateQuestions).mockResolvedValue({
    questions: [
      { subject: "What is a closure?", expected_answer: "A function plus scope" },
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Fills in the minimum needed to enable Generate: a bank name and one block. */
async function makeGeneratable(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Bank Subject"), "Closures");
  await user.click(screen.getByRole("button", { name: /^Add$/ }));

  const editor = screen.getByRole("dialog");
  await user.type(
    within(editor).getByPlaceholderText(/Paste your study material/),
    "Closures capture their surrounding scope."
  );
  await user.click(within(editor).getByRole("button", { name: "Add" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

function generateButton() {
  return screen.getByRole("button", { name: /Generate Questions/ });
}

// Replacing the drafts is destructive and used to be gated by window.confirm,
// which blocks the whole renderer, can't be styled, and is a no-op in some
// webviews — there the confirmation silently didn't happen and the edited
// questions vanished.
describe("AIGenerateView replace confirmation", () => {
  test("generating with nothing on screen does not ask", async () => {
    const user = userEvent.setup();
    render(<AIGenerateView onBack={vi.fn()} />);
    await makeGeneratable(user);

    await user.click(generateButton());

    await waitFor(() => expect(api.generateQuestions).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("generating over existing questions asks first and generates nothing yet", async () => {
    const user = userEvent.setup();
    render(<AIGenerateView onBack={vi.fn()} />);
    await makeGeneratable(user);
    await user.click(generateButton());
    await waitFor(() => screen.getByText("What is a closure?"));

    await user.click(generateButton());

    expect(screen.getByRole("dialog").textContent).toMatch(
      /discard the 1 question below/
    );
    expect(api.generateQuestions).toHaveBeenCalledTimes(1);
  });

  test("cancelling the confirmation keeps the current questions", async () => {
    const user = userEvent.setup();
    render(<AIGenerateView onBack={vi.fn()} />);
    await makeGeneratable(user);
    await user.click(generateButton());
    await waitFor(() => screen.getByText("What is a closure?"));

    await user.click(generateButton());
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" })
    );

    expect(api.generateQuestions).toHaveBeenCalledTimes(1);
    expect(screen.getByText("What is a closure?")).toBeTruthy();
  });

  test("confirming the replacement generates again", async () => {
    const user = userEvent.setup();
    render(<AIGenerateView onBack={vi.fn()} />);
    await makeGeneratable(user);
    await user.click(generateButton());
    await waitFor(() => screen.getByText("What is a closure?"));

    await user.click(generateButton());
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Replace" })
    );

    await waitFor(() => expect(api.generateQuestions).toHaveBeenCalledTimes(2));
  });
});
