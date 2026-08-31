import { describe, expect, test, vi } from "vitest";
import { saveSequentially } from "./sequentialSave";

describe("saveSequentially", () => {
  test("reports every item as saved when all succeed", async () => {
    const result = await saveSequentially(["a", "b", "c"], async () => {});

    expect(result.saved).toEqual(["a", "b", "c"]);
    expect(result.remaining).toEqual([]);
    expect(result.error).toBeNull();
  });

  test("stops at the first failure and keeps the failed item in remaining", async () => {
    const boom = new Error("bank is full");
    const save = vi.fn(async (item: string) => {
      if (item === "c") throw boom;
    });

    const result = await saveSequentially(["a", "b", "c", "d", "e"], save);

    // "c" failed, so it was never persisted — it must be retried, not dropped.
    expect(result.saved).toEqual(["a", "b"]);
    expect(result.remaining).toEqual(["c", "d", "e"]);
    expect(result.error).toBe(boom);
    // Nothing after the failure is attempted.
    expect(save).toHaveBeenCalledTimes(3);
  });

  test("saves one at a time, in order", async () => {
    const inFlight: string[] = [];
    const order: string[] = [];
    const save = vi.fn(async (item: string) => {
      inFlight.push(item);
      expect(inFlight).toHaveLength(1);
      await Promise.resolve();
      order.push(item);
      inFlight.pop();
    });

    await saveSequentially(["a", "b", "c"], save);

    expect(order).toEqual(["a", "b", "c"]);
  });

  test("does nothing for an empty list", async () => {
    const save = vi.fn(async () => {});

    const result = await saveSequentially([], save);

    expect(save).not.toHaveBeenCalled();
    expect(result).toEqual({ saved: [], remaining: [], error: null });
  });

  test("surfaces a non-Error rejection unchanged", async () => {
    const result = await saveSequentially(["a"], async () => {
      throw "just a string";
    });

    expect(result.error).toBe("just a string");
    expect(result.saved).toEqual([]);
    expect(result.remaining).toEqual(["a"]);
  });
});
