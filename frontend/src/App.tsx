import { useState } from "react";
import { CategoriesList } from "./components/CategoriesList";
import { BankDetail } from "./components/BankDetail";
import { PracticeSession } from "./components/PracticeSession";
import { Results } from "./components/Results";
import { api } from "./api";
import type {
  BankType,
  Session,
  SessionQuestion,
  SessionResult,
} from "./types";
import "./App.css";

// Re-export types and api for backward compatibility with existing components
export type {
  Folder,
  Category,
  Bank,
  BankType,
  Question,
  SessionQuestion,
  SessionConfig,
  Session,
  SessionResult,
  QuestionResult,
  ExportQuestion,
  ExportBank,
  ExportCategory,
  ExportFolder,
  ExportData,
  ImportResult,
} from "./types";
export { api } from "./api";

type View =
  | { type: "home" }
  | { type: "bank"; bankId: string }
  | {
      type: "practice";
      session: Session;
      bankId: string;
      bankSubject: string;
      bankType: BankType;
      bankLanguage?: string | null;
    }
  | {
      type: "results";
      results: SessionResult;
      questions: SessionQuestion[];
      bankId: string;
      bankSubject: string;
      bankType: BankType;
      bankLanguage?: string | null;
    };

function App() {
  const [view, setView] = useState<View>({ type: "home" });

  const navigate = {
    toHome: () => setView({ type: "home" }),
    toBank: (bankId: string) => setView({ type: "bank", bankId }),
    toPractice: (
      session: Session,
      bankId: string,
      bankSubject: string,
      bankType: BankType,
      bankLanguage?: string | null
    ) =>
      setView({
        type: "practice",
        session,
        bankId,
        bankSubject,
        bankType,
        bankLanguage,
      }),
    toResults: (
      results: SessionResult,
      questions: SessionQuestion[],
      bankId: string,
      bankSubject: string,
      bankType: BankType,
      bankLanguage?: string | null
    ) =>
      setView({
        type: "results",
        results,
        questions,
        bankId,
        bankSubject,
        bankType,
        bankLanguage,
      }),
  };

  async function handleRetry(
    bankId: string,
    questionIds: string[],
    bankSubject: string,
    bankType: BankType,
    bankLanguage?: string | null
  ) {
    try {
      const session = await api.createSession(bankId, {
        question_ids: questionIds,
      });
      navigate.toPractice(session, bankId, bankSubject, bankType, bankLanguage);
    } catch (err: unknown) {
      console.error("Failed to create retry session:", err);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <button className="logo" onClick={navigate.toHome}>
          <span className="logo-icon">◈</span>
          <span className="logo-text">Remaimber</span>
        </button>
      </header>

      <main className="main-content">
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
                view.bankId,
                view.bankSubject,
                view.bankType,
                view.bankLanguage
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
            bankType={view.bankType}
            bankLanguage={view.bankLanguage}
            onBack={navigate.toHome}
            onRetry={() =>
              handleRetry(
                view.bankId,
                view.questions.map((q) => q.id),
                view.bankSubject,
                view.bankType,
                view.bankLanguage
              )
            }
          />
        )}
      </main>
    </div>
  );
}

export default App;
