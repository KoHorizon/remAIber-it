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

const API_BASE = "http://localhost:8080";

// Folders

export async function getFolders(): Promise<Folder[]> {
  try {
    const res = await fetch(`${API_BASE}/folders`);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error("Failed to fetch folders");
    return res.json();
  } catch {
    return [];
  }
}

export async function getFolder(
  id: string
): Promise<Folder & { categories: Category[] }> {
  const res = await fetch(`${API_BASE}/folders/${id}`);
  if (!res.ok) throw new Error("Folder not found");
  return res.json();
}

export async function createFolder(name: string): Promise<Folder> {
  const res = await fetch(`${API_BASE}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create folder");
  return res.json();
}

export async function updateFolder(id: string, name: string): Promise<Folder> {
  const res = await fetch(`${API_BASE}/folders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to rename folder");
  return res.json();
}

export async function deleteFolder(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/folders/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete folder");
}

// Categories

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function getCategory(id: string): Promise<Category> {
  const res = await fetch(`${API_BASE}/categories/${id}`);
  if (!res.ok) throw new Error("Category not found");
  return res.json();
}

type CreateCategoryBody = {
  name: string;
  folder_id?: string;
};

export async function createCategory(
  name: string,
  folderId?: string
): Promise<Category> {
  const body: CreateCategoryBody = { name };
  if (folderId) body.folder_id = folderId;
  const res = await fetch(`${API_BASE}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function updateCategory(
  id: string,
  name: string
): Promise<Category> {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to update category");
  return res.json();
}

export async function updateCategoryFolder(
  categoryId: string,
  folderId: string | null
): Promise<Category> {
  const res = await fetch(`${API_BASE}/categories/${categoryId}/folder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_id: folderId }),
  });
  if (!res.ok) throw new Error("Failed to update category folder");
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete category");
}

// Banks

export async function getBanks(): Promise<Bank[]> {
  const res = await fetch(`${API_BASE}/banks`);
  if (!res.ok) throw new Error("Failed to fetch banks");
  return res.json();
}

export async function getBank(id: string): Promise<Bank> {
  const res = await fetch(`${API_BASE}/banks/${id}`);
  if (!res.ok) throw new Error("Bank not found");
  return res.json();
}

export async function createBank(
  subject: string,
  categoryId?: string,
  bankType?: BankType,
  language?: string
): Promise<Bank> {
  const res = await fetch(`${API_BASE}/banks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject,
      category_id: categoryId || null,
      bank_type: bankType || "theory",
      language: language || null,
    }),
  });
  if (!res.ok) throw new Error("Failed to create bank");
  return res.json();
}

export async function updateBankCategory(
  bankId: string,
  categoryId: string | null
): Promise<Bank> {
  const res = await fetch(`${API_BASE}/banks/${bankId}/category`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_id: categoryId }),
  });
  if (!res.ok) throw new Error("Failed to update bank category");
  return res.json();
}

export async function updateBankGradingPrompt(
  bankId: string,
  gradingPrompt: string | null
): Promise<Bank> {
  const res = await fetch(`${API_BASE}/banks/${bankId}/grading-prompt`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grading_prompt: gradingPrompt }),
  });
  if (!res.ok) throw new Error("Failed to update grading prompt");
  return res.json();
}

export async function deleteBank(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/banks/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete bank");
}

// Questions

export async function addQuestion(
  bankId: string,
  subject: string,
  expectedAnswer: string
): Promise<Question> {
  const res = await fetch(`${API_BASE}/banks/${bankId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, expected_answer: expectedAnswer }),
  });
  if (!res.ok) throw new Error("Failed to add question");
  return res.json();
}

export async function deleteQuestion(
  bankId: string,
  questionId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/banks/${bankId}/questions/${questionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete question");
}

// Sessions

export async function createSession(
  bankId: string,
  config?: SessionConfig
): Promise<Session> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bank_id: bankId,
      max_questions: config?.max_questions,
      max_duration_min: config?.max_duration_min,
      focus_on_weak: config?.focus_on_weak || false,
      question_ids: config?.question_ids,
    }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  answer: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, answer }),
  });
  if (!res.ok) throw new Error("Failed to submit answer");
}

export async function completeSession(sessionId: string): Promise<SessionResult> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to complete session");
  return res.json();
}

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

export async function createQuickSession(
  config: QuickSessionConfig
): Promise<QuickSession> {
  const res = await fetch(`${API_BASE}/sessions/quick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to create quick session");
  return res.json();
}

// Export/Import

export async function exportAll(): Promise<ExportData> {
  const res = await fetch(`${API_BASE}/export`);
  if (!res.ok) throw new Error("Failed to export data");
  return res.json();
}

export async function importAll(data: ExportData): Promise<ImportResult> {
  const res = await fetch(`${API_BASE}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to import data");
  return res.json();
}

// Convenience object for backward compatibility
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
  getBanks,
  getBank,
  createBank,
  updateBankCategory,
  updateBankGradingPrompt,
  deleteBank,
  addQuestion,
  deleteQuestion,
  createSession,
  createQuickSession,
  submitAnswer,
  completeSession,
  exportAll,
  importAll,
};
