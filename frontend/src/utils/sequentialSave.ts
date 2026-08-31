export type SequentialSaveResult<T> = {
  /** Items the save call accepted, in the order they were sent. */
  saved: T[];
  /** Items not persisted — the one that failed, plus everything after it. */
  remaining: T[];
  /** Whatever `save` rejected with, or null if every item went through. */
  error: unknown | null;
};

/**
 * Saves items one at a time, stopping at the first failure and reporting
 * exactly which ones were persisted.
 *
 * A bare `for (const x of xs) await save(x)` loses that information: the throw
 * unwinds with no record of how far it got, so the caller can only either drop
 * the whole batch or resend it — and resending duplicates everything already
 * written. `remaining` is what a retry should send.
 */
export async function saveSequentially<T>(
  items: readonly T[],
  save: (item: T) => Promise<unknown>,
): Promise<SequentialSaveResult<T>> {
  for (let i = 0; i < items.length; i++) {
    try {
      await save(items[i]);
    } catch (error) {
      return {
        saved: items.slice(0, i),
        remaining: items.slice(i),
        error,
      };
    }
  }
  return { saved: [...items], remaining: [], error: null };
}
