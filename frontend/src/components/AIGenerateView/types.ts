import type { GeneratedQuestion } from "../../api";

/**
 * A generated question while it is still being edited in this view. The id is
 * client-side only — nothing is persisted until Save or Export — but the cards
 * are individually editable and deletable, so position is not identity.
 */
export type DraftQuestion = GeneratedQuestion & { id: string };

/** Which field of a draft an edit targets. */
export type DraftField = "subject" | "expected_answer" | "grading_prompt";

/**
 * One block of study material. Carries an id for the same reason drafts do:
 * keying and editing by index meant a delete shifted every card below it.
 */
export type ContentItem = { id: string; text: string };

/** Whether questions are destined for an existing bank or an exported new one. */
export type BankMode = "existing" | "new";
