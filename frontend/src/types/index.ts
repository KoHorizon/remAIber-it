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
  banks?: Bank[];
};

export type BankType = "theory" | "code" | "cli";

export type Bank = {
  id: string;
  subject: string;
  category_id?: string | null;
  grading_prompt?: string | null;
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

export type SessionQuestion = {
  id: string;
  subject: string;
  expected_answer?: string;
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
};

export type ExportBank = {
  subject: string;
  grading_prompt?: string | null;
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
  folders_created?: number;
  categories_created: number;
  banks_created: number;
  questions_created: number;
};
