// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { Bank, BankType } from "../../types";

vi.mock("../../api", () => ({ api: { getBanks: vi.fn() } }));

const { api } = await import("../../api");
const { useBankTarget } = await import("./useBankTarget");

function bank(id: string, subject: string, bank_type: BankType): Bank {
  return { id, subject, bank_type, mastery: 0, question_count: 3 };
}

const BANKS = [
  bank("t1", "Closures", "theory"),
  bank("c1", "Goroutines", "code"),
];

beforeEach(() => {
  vi.mocked(api.getBanks).mockResolvedValue(BANKS);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Renders the hook with a settable bank type, as the view drives it. */
function renderBankTarget(initialType: BankType = "theory") {
  let type = initialType;
  const rendered = renderHook(({ bankType }) => useBankTarget(bankType), {
    initialProps: { bankType: type },
  });
  return {
    ...rendered,
    setType(next: BankType) {
      type = next;
      rendered.rerender({ bankType: type });
    },
  };
}

describe("useBankTarget", () => {
  test("only offers banks of the current type", async () => {
    const { result } = renderBankTarget("code");

    await waitFor(() => expect(result.current.banks).toHaveLength(1));
    expect(result.current.banks[0].subject).toBe("Goroutines");
  });

  test("picking an existing bank switches out of new-bank mode", async () => {
    const { result } = renderBankTarget();
    await waitFor(() => expect(result.current.banks).toHaveLength(1));

    act(() => result.current.selectExisting("t1"));

    expect(result.current.mode).toBe("existing");
    expect(result.current.selectedBankId).toBe("t1");
  });

  // Changing the type re-lists the banks, so a selection made under the old
  // type would point at a bank that is no longer offered — and would send,
  // say, CLI questions into a theory bank.
  test("changing the bank type drops the selected bank", async () => {
    const { result, setType } = renderBankTarget();
    await waitFor(() => expect(result.current.banks).toHaveLength(1));
    act(() => result.current.selectExisting("t1"));

    act(() => setType("code"));

    expect(result.current.selectedBankId).toBeNull();
  });

  test("a new bank is only a target once it has a subject", async () => {
    const { result } = renderBankTarget();

    expect(result.current.hasTarget).toBe(false);
    act(() => result.current.setSubject("  Closures  "));
    expect(result.current.hasTarget).toBe(true);
  });

  test("an existing bank is only a target once one is picked", async () => {
    const { result } = renderBankTarget();
    await waitFor(() => expect(result.current.banks).toHaveLength(1));

    act(() => result.current.selectNew());
    act(() => result.current.selectExisting("t1"));

    expect(result.current.hasTarget).toBe(true);
  });

  // The banks list is a convenience, not a requirement: you can still name a
  // new bank and export when the backend is unreachable.
  test("a failed load leaves an empty list rather than throwing", async () => {
    vi.mocked(api.getBanks).mockRejectedValue(new Error("offline"));
    const { result } = renderBankTarget();

    await waitFor(() => expect(api.getBanks).toHaveBeenCalled());
    expect(result.current.banks).toEqual([]);
  });
});
