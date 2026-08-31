import type {
  Folder,
  Category,
  Bank,
  BankType,
  Question,
  Session,
  SessionConfig,
  SessionResult,
  ExportData,
  ImportResult,
} from "../types";
import { get, post, put, patch, del } from "./request";

export { ApiError, API_BASE } from "./request";

// Folders

export const getFolders = () => get<Folder[]>("/folders");

export const getFolder = (id: string) =>
  get<Folder & { categories: Category[] }>(`/folders/${id}`);

export const createFolder = (name: string) => post<Folder>("/folders", { name });

export const updateFolder = (id: string, name: string) =>
  put<Folder>(`/folders/${id}`, { name });

export const deleteFolder = (id: string) => del(`/folders/${id}`);

// Categories

export const getCategories = () => get<Category[]>("/categories");

export const getCategory = (id: string) => get<Category>(`/categories/${id}`);

export const createCategory = (name: string, folderId?: string) =>
  post<Category>("/categories", folderId ? { name, folder_id: folderId } : { name });

export const updateCategory = (id: string, name: string) =>
  put<Category>(`/categories/${id}`, { name });

export const updateCategoryFolder = (
  categoryId: string,
  folderId: string | null
) => patch<Category>(`/categories/${categoryId}/folder`, { folder_id: folderId });

export const deleteCategory = (id: string) => del(`/categories/${id}`);

export const reorderCategories = (ids: string[]) =>
  patch<void>("/categories/reorder", { ids });

// Banks

export const getBanks = () => get<Bank[]>("/banks");

export const getBank = (id: string) => get<Bank>(`/banks/${id}`);

export const createBank = (
  subject: string,
  categoryId?: string,
  bankType?: BankType,
  language?: string
) =>
  post<Bank>("/banks", {
    subject,
    category_id: categoryId || null,
    bank_type: bankType || "theory",
    language: language || null,
  });

export const updateBankCategory = (bankId: string, categoryId: string | null) =>
  patch<Bank>(`/banks/${bankId}/category`, { category_id: categoryId });

export const deleteBank = (id: string) => del(`/banks/${id}`);

// Questions

type QuestionBody = {
  subject: string;
  expected_answer: string;
  grading_prompt?: string;
};

function questionBody(
  subject: string,
  expectedAnswer: string,
  gradingPrompt?: string | null
): QuestionBody {
  const body: QuestionBody = { subject, expected_answer: expectedAnswer };
  if (gradingPrompt) body.grading_prompt = gradingPrompt;
  return body;
}

export const addQuestion = (
  bankId: string,
  subject: string,
  expectedAnswer: string,
  gradingPrompt?: string | null
) =>
  post<Question>(
    `/banks/${bankId}/questions`,
    questionBody(subject, expectedAnswer, gradingPrompt)
  );

export const updateQuestion = (
  bankId: string,
  questionId: string,
  subject: string,
  expectedAnswer: string,
  gradingPrompt?: string | null
) =>
  put<Question>(
    `/banks/${bankId}/questions/${questionId}`,
    questionBody(subject, expectedAnswer, gradingPrompt)
  );

export const deleteQuestion = (bankId: string, questionId: string) =>
  del(`/banks/${bankId}/questions/${questionId}`);

// Sessions

export const createSession = (bankId: string, config?: SessionConfig) =>
  post<Session>("/sessions", {
    bank_id: bankId,
    max_questions: config?.max_questions,
    max_duration_min: config?.max_duration_min,
    focus_on_weak: config?.focus_on_weak || false,
    question_ids: config?.question_ids,
  });

export const submitAnswer = (
  sessionId: string,
  questionId: string,
  answer: string
) =>
  post<void>(`/sessions/${sessionId}/answers`, {
    question_id: questionId,
    answer,
  });

export const completeSession = (sessionId: string) =>
  post<SessionResult>(`/sessions/${sessionId}/complete`);

// Quick Practice (multi-bank session)

export type QuickSessionConfig = {
  bank_ids: string[];
  max_per_bank?: number;
  max_duration_min?: number;
};

export type QuickSessionQuestion = {
  id: string;
  subject: string;
  expected_answer: string;
  bank_id: string;
  bank_subject: string;
  bank_type: string;
};

export type QuickSession = {
  id: string;
  status: string;
  questions: QuickSessionQuestion[];
  focus_on_weak: boolean;
  is_multi_bank: boolean;
  max_duration_min?: number;
};

export const createQuickSession = (config: QuickSessionConfig) =>
  post<QuickSession>("/sessions/quick", config);

// Stats

export const getOverallStats = () => get<{ mastery: number }>("/stats");

// Export/Import

export const exportAll = () => get<ExportData>("/export");

export const importAll = (data: ExportData) =>
  post<ImportResult>("/import", data);

// Simulate Grading

export type SimulateGradeRequest = {
  question: string;
  expected_answer: string;
  user_answer: string;
  bank_type: BankType;
  grading_prompt?: string | null;
};

export type SimulateGradeResult = {
  score: number;
  covered: string[];
  missed: string[];
};

export const simulateGrade = (req: SimulateGradeRequest) =>
  post<SimulateGradeResult>("/simulate/grade", req);

// Generate Questions

export type GenerateQuestionsRequest = {
  content: string;
  bank_type: BankType;
  language?: string | null;
  count: number;
  direction?: string;
};

export type GeneratedQuestion = {
  subject: string;
  expected_answer: string;
  grading_prompt?: string | null;
};

export type GenerateQuestionsResponse = {
  questions: GeneratedQuestion[];
};

export const generateQuestions = (req: GenerateQuestionsRequest) =>
  post<GenerateQuestionsResponse>("/generate/questions", req);

// Barrel object — the primary interface used across the app.
export const api = {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  updateCategoryFolder,
  deleteCategory,
  reorderCategories,
  getBanks,
  getBank,
  createBank,
  updateBankCategory,
  deleteBank,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  createSession,
  createQuickSession,
  submitAnswer,
  completeSession,
  getOverallStats,
  exportAll,
  importAll,
  simulateGrade,
  generateQuestions,
};
