import { useState } from "react";
import { CategoriesList } from "./components/CategoriesList";
import { BankDetail } from "./components/BankDetail";
import { PracticeSession } from "./components/PracticeSession";
import { Results } from "./components/Results";
import "./App.css";

export type Category = {
  id: string;
  name: string;
  mastery: number;
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
  questions?: Question[];
};

export type Question = {
  id: string;
  subject: string;
  expected_answer?: string;
  mastery: number;
  times_answered: number;
  times_correct: number;
};

export type SessionQuestion = {
  id: string;
  subject: string;
  expected_answer?: string;
};

export type SessionConfig = {
  max_questions?: number;
  max_duration_min?: number;
  focus_on_weak?: boolean;
};

export type Session = {
  id: string;
  questions: SessionQuestion[];
  max_duration_min?: number;
  focus_on_weak?: boolean;
};

export type SessionResult = {
  session_id: string;
  total_score: number;
  max_score: number;
  results: {
    score: number;
    covered: string[];
    missed: string[];
    user_answer: string;
  }[];
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

export type ExportData = {
  version: string;
  exported_at: string;
  categories: ExportCategory[];
};

export type ImportResult = {
  categories_created: number;
  banks_created: number;
  questions_created: number;
};

type View =
  | { type: "home" }
  | { type: "bank"; bankId: string }
  | {
      type: "practice";
      session: Session;
      bankSubject: string;
      bankType: BankType;
      bankLanguage?: string | null;
    }
  | {
      type: "results";
      results: SessionResult;
      questions: SessionQuestion[];
      bankSubject: string;
    };

const API_BASE = "http://localhost:8080";

export const api = {
  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
  },

  async getCategory(id: string): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}`);
    if (!res.ok) throw new Error("Category not found");
    return res.json();
  },

  async createCategory(name: string): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create category");
    return res.json();
  },

  async updateCategory(id: string, name: string): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to update category");
    return res.json();
  },

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete category");
  },

  // Banks
  async getBanks(): Promise<Bank[]> {
    const res = await fetch(`${API_BASE}/banks`);
    if (!res.ok) throw new Error("Failed to fetch banks");
    return res.json();
  },

  async getBank(id: string): Promise<Bank> {
    const res = await fetch(`${API_BASE}/banks/${id}`);
    if (!res.ok) throw new Error("Bank not found");
    return res.json();
  },

  async createBank(
    subject: string,
    categoryId?: string,
    bankType?: BankType,
    language?: string,
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
  },

  async updateBankCategory(
    bankId: string,
    categoryId: string | null,
  ): Promise<Bank> {
    const res = await fetch(`${API_BASE}/banks/${bankId}/category`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_id: categoryId }),
    });
    if (!res.ok) throw new Error("Failed to update bank category");
    return res.json();
  },

  async updateBankGradingPrompt(
    bankId: string,
    gradingPrompt: string | null,
  ): Promise<Bank> {
    const res = await fetch(`${API_BASE}/banks/${bankId}/grading-prompt`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grading_prompt: gradingPrompt }),
    });
    if (!res.ok) throw new Error("Failed to update grading prompt");
    return res.json();
  },

  async deleteBank(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/banks/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete bank");
  },

  // Questions
  async addQuestion(
    bankId: string,
    subject: string,
    expected_answer: string,
  ): Promise<Question> {
    const res = await fetch(`${API_BASE}/banks/${bankId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, expected_answer }),
    });
    if (!res.ok) throw new Error("Failed to add question");
    return res.json();
  },

  async deleteQuestion(bankId: string, questionId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE}/banks/${bankId}/questions/${questionId}`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok) throw new Error("Failed to delete question");
  },

  // Sessions
  async createSession(
    bankId: string,
    config?: SessionConfig,
  ): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bank_id: bankId,
        max_questions: config?.max_questions,
        max_duration_min: config?.max_duration_min,
        focus_on_weak: config?.focus_on_weak || false,
      }),
    });
    if (!res.ok) throw new Error("Failed to create session");
    return res.json();
  },

  async submitAnswer(
    sessionId: string,
    questionId: string,
    answer: string,
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, answer }),
    });
    if (!res.ok) throw new Error("Failed to submit answer");
  },

  async completeSession(sessionId: string): Promise<SessionResult> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to complete session");
    return res.json();
  },

  // Export/Import
  async exportAll(): Promise<ExportData> {
    const res = await fetch(`${API_BASE}/export`);
    if (!res.ok) throw new Error("Failed to export data");
    return res.json();
  },

  async importAll(data: ExportData): Promise<ImportResult> {
    const res = await fetch(`${API_BASE}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to import data");
    return res.json();
  },
};

function App() {
  const [view, setView] = useState<View>({ type: "home" });

  const navigate = {
    toHome: () => setView({ type: "home" }),
    toBank: (bankId: string) => setView({ type: "bank", bankId }),
    toPractice: (
      session: Session,
      bankSubject: string,
      bankType: BankType,
      bankLanguage?: string | null,
    ) =>
      setView({
        type: "practice",
        session,
        bankSubject,
        bankType,
        bankLanguage,
      }),
    toResults: (
      results: SessionResult,
      questions: SessionQuestion[],
      bankSubject: string,
    ) => setView({ type: "results", results, questions, bankSubject }),
  };

  return (
    <div className="app">
      <header className="header">
        <button className="logo" onClick={navigate.toHome}>
          <span className="logo-icon">◈</span>
          <span className="logo-text">Remaimber</span>
        </button>
      </header>

      <main className="main">
        {view.type === "home" && (
          <CategoriesList onSelectBank={navigate.toBank} />
        )}
        {view.type === "bank" && (
          <BankDetail
            bankId={view.bankId}
            onBack={navigate.toHome}
            onStartPractice={navigate.toPractice}
          />
        )}
        {view.type === "practice" && (
          <PracticeSession
            session={view.session}
            bankSubject={view.bankSubject}
            bankType={view.bankType}
            bankLanguage={view.bankLanguage}
            onComplete={(results) =>
              navigate.toResults(
                results,
                view.session.questions,
                view.bankSubject,
              )
            }
            onCancel={navigate.toHome}
          />
        )}
        {view.type === "results" && (
          <Results
            results={view.results}
            questions={view.questions}
            bankSubject={view.bankSubject}
            onBack={navigate.toHome}
          />
        )}
      </main>
    </div>
  );
}

export default App;
