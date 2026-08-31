// Domain types

export type Folder = {
  id: string;
  name: string;
  is_system?: boolean;
  mastery: number;
};

export type Category = {
  id: string;
  name: string;
  mastery: number;
  folder_id?: string | null;
  sort_order?: number;
  banks?: Bank[];
};

export type BankType = "theory" | "code" | "cli";

export type Bank = {
  id: string;
  subject: string;
  category_id?: string | null;
  bank_type: BankType;
  language?: string | null;
  mastery: number;
  question_count?: number;
  questions?: Question[];
};

export type Question = {
  id: string;
  subject: string;
  expected_answer?: string;
  grading_prompt?: string | null;
  mastery: number;
  times_answered: number;
  times_correct: number;
};

/**
 * The subset of a bank that views need to identify and render it. These four
 * fields travel together through every bank-scoped view, so they move as one
 * value: passed positionally they were four arguments, three of them strings,
 * and a transposition typechecked cleanly.
 */
export type BankRef = {
  id: string;
  subject: string;
  type: BankType;
  language?: string | null;
};

/** A question's editable fields, as the editor wants them prefilled. */
export type QuestionDraft = {
  id: string;
  subject: string;
  answer: string;
  gradingPrompt?: string | null;
};

export type SessionQuestion = {
  id: string;
  subject: string;
  expected_answer?: string;
  grading_prompt?: string | null;
  // For multi-bank sessions
  bank_id?: string;
  bank_subject?: string;
  bank_type?: string;
};

export type SessionConfig = {
  max_questions?: number;
  max_duration_min?: number;
  focus_on_weak?: boolean;
  question_ids?: string[];
};

export type Session = {
  id: string;
  questions: SessionQuestion[];
  max_duration_min?: number;
  focus_on_weak?: boolean;
  is_multi_bank?: boolean;
};

export type SessionResult = {
  session_id: string;
  total_score: number;
  max_score: number;
  results: QuestionResult[];
};

export type QuestionResult = {
  score: number;
  covered: string[];
  missed: string[];
  user_answer: string;
};

// Export/Import types

export type ExportQuestion = {
  subject: string;
  expected_answer: string;
  grading_prompt?: string | null;
};

export type ExportBank = {
  subject: string;
  bank_type: string;
  language?: string | null;
  questions: ExportQuestion[];
};

export type ExportCategory = {
  name: string;
  banks: ExportBank[];
};

export type ExportFolder = {
  name: string;
  categories: ExportCategory[];
};

export type ExportData = {
  version: string;
  exported_at: string;
  folders?: ExportFolder[];
  categories: ExportCategory[];
};

export type ImportResult = {
  folders_created: number;
  categories_created: number;
  banks_created: number;
  questions_created: number;
  /** Present only when items were skipped. Import is not transactional, so a
   *  partial result is a real outcome the user has to see. */
  errors?: string[];
};
