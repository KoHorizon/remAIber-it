import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Library } from "./components/Library";
import { BankDetail } from "./components/BankDetail/index";
import { AddQuestionView } from "./components/AddQuestionView";
import { PracticeSession } from "./components/PracticeSession";
import { Results } from "./components/Results";
import { SimulationView } from "./components/SimulationView";
import { AIGenerateView } from "./components/AIGenerateView";
import { SettingsView } from "./components/SettingsView";
import { useLibraryActions } from "./context";
import { api } from "./api";
import type { BankType, Session, SessionQuestion, SessionResult } from "./types";
import "./App.css";

type MainView = "dashboard" | "library" | "settings";

type View =
  | { type: "main"; mainView: MainView }
  | { type: "bank"; bankId: string; returnTo: MainView }
  | {
      type: "addQuestion";
      bankId: string;
      bankSubject: string;
      bankType: BankType;
      bankLanguage?: string | null;
      returnTo: MainView;
    }
  | {
      type: "editQuestion";
      bankId: string;
      bankSubject: string;
      bankType: BankType;
      bankLanguage?: string | null;
      questionId: string;
      questionSubject: string;
      questionAnswer: string;
      questionGradingPrompt?: string | null;
      returnTo: MainView;
    }
  | {
      type: "practice";
      session: Session;
      bankId: string;
      bankSubject: string;
      bankType: BankType;
      bankLanguage?: string | null;
      returnTo: MainView;
    }
  | {
      type: "results";
      results: SessionResult;
      questions: SessionQuestion[];
      bankId: string;
      bankSubject: string;
      bankType: BankType;
      bankLanguage?: string | null;
      returnTo: MainView;
    }
  | {
      type: "simulate";
      returnTo: MainView;
    }
  | {
      type: "generateQuestions";
      returnTo: MainView;
    };

function App() {
  const { refreshAll } = useLibraryActions();
  const [view, setView] = useState<View>({ type: "main", mainView: "dashboard" });

  const currentMainView = view.type === "main" ? view.mainView : "dashboard";

  const navigate = {
    toMain: (mainView: MainView) => setView({ type: "main", mainView }),
    toBank: (bankId: string, returnTo: MainView = currentMainView) =>
      setView({ type: "bank", bankId, returnTo }),
    toAddQuestion: (
      bankId: string,
      bankSubject: string,
      bankType: BankType,
      bankLanguage?: string | null,
      returnTo: MainView = currentMainView
    ) =>
      setView({
        type: "addQuestion",
        bankId,
        bankSubject,
        bankType,
        bankLanguage,
        returnTo,
      }),
    toEditQuestion: (
      bankId: string,
      bankSubject: string,
      bankType: BankType,
      bankLanguage: string | null | undefined,
      questionId: string,
      questionSubject: string,
      questionAnswer: string,
      questionGradingPrompt: string | null | undefined,
      returnTo: MainView = currentMainView
    ) =>
      setView({
        type: "editQuestion",
        bankId,
        bankSubject,
        bankType,
        bankLanguage,
        questionId,
        questionSubject,
        questionAnswer,
        questionGradingPrompt,
        returnTo,
      }),
    toPractice: (
      session: Session,
      bankId: string,
      bankSubject: string,
      bankType: BankType,
      bankLanguage?: string | null,
      returnTo: MainView = currentMainView
    ) =>
      setView({
        type: "practice",
        session,
        bankId,
        bankSubject,
        bankType,
        bankLanguage,
        returnTo,
      }),
    toResults: (
      results: SessionResult,
      questions: SessionQuestion[],
      bankId: string,
      bankSubject: string,
      bankType: BankType,
      bankLanguage?: string | null,
      returnTo: MainView = currentMainView
    ) =>
      setView({
        type: "results",
        results,
        questions,
        bankId,
        bankSubject,
        bankType,
        bankLanguage,
        returnTo,
      }),
    toSimulate: (returnTo: MainView = currentMainView) =>
      setView({ type: "simulate", returnTo }),
    toGenerateQuestions: (returnTo: MainView = currentMainView) =>
      setView({ type: "generateQuestions", returnTo }),
  };

  async function handleRetry(
    bankId: string,
    questionIds: string[],
    bankSubject: string,
    bankType: BankType,
    bankLanguage?: string | null,
    returnTo: MainView = currentMainView
  ) {
    try {
      const session = await api.createSession(bankId, {
        question_ids: questionIds,
      });
      navigate.toPractice(session, bankId, bankSubject, bankType, bankLanguage, returnTo);
    } catch (err: unknown) {
      console.error("Failed to create retry session:", err);
    }
  }

  async function handleQuickPractice(bankIds: string[]) {
    if (bankIds.length === 0) return;

    try {
      // Use the new multi-bank quick session endpoint
      const quickSession = await api.createQuickSession({
        bank_ids: bankIds,
        max_per_bank: 5,
      });

      // Convert to Session format for PracticeSession component
      const session: Session = {
        id: quickSession.id,
        questions: quickSession.questions.map((q) => ({
          id: q.id,
          subject: q.subject,
          expected_answer: q.expected_answer,
          bank_id: q.bank_id,
          bank_subject: q.bank_subject,
          bank_type: q.bank_type,
        })),
        max_duration_min: quickSession.max_duration_min,
        focus_on_weak: quickSession.focus_on_weak,
        is_multi_bank: true,
      };

      navigate.toPractice(
        session,
        "multi", // Special marker for multi-bank sessions
        "Quick Practice",
        "theory", // Default, individual questions have their own type
        null,
        "dashboard"
      );
    } catch (err: unknown) {
      console.error("Failed to start quick practice:", err);
    }
  }

  // Check if we're in a full-screen view (practice/results/addQuestion/editQuestion/simulate/generateQuestions)
  const isFullScreen = view.type === "practice" || view.type === "results" || view.type === "addQuestion" || view.type === "editQuestion" || view.type === "simulate" || view.type === "generateQuestions";

  return (
    <div className={`app ${isFullScreen ? "app-fullscreen" : "app-with-sidebar"}`}>
      {/* Sidebar - hidden during practice/results */}
      {!isFullScreen && (
        <Sidebar
          currentView={currentMainView}
          onNavigate={(mainView) => navigate.toMain(mainView)}
          onSimulate={() => navigate.toSimulate()}
          onGenerateQuestions={() => navigate.toGenerateQuestions()}
          onSettings={() => navigate.toMain("settings")}
        />
      )}

      <main className={`main-content ${isFullScreen ? "main-fullscreen" : ""}`}>
        {/* Dashboard */}
        {view.type === "main" && view.mainView === "dashboard" && (
          <Dashboard
            onSelectBank={(bankId) => navigate.toBank(bankId, "dashboard")}
            onQuickPractice={handleQuickPractice}
          />
        )}

        {/* Library */}
        {view.type === "main" && view.mainView === "library" && (
          <Library onSelectBank={(bankId) => navigate.toBank(bankId, "library")} />
        )}

        {/* Settings */}
        {view.type === "main" && view.mainView === "settings" && (
          <SettingsView />
        )}

        {/* Bank Detail */}
        {view.type === "bank" && (
          <BankDetail
            bankId={view.bankId}
            onBack={() => navigate.toMain(view.returnTo)}
            onAddQuestion={(bankId, subject, bankType, language) =>
              navigate.toAddQuestion(bankId, subject, bankType, language, view.returnTo)
            }
            onEditQuestion={(bankId, subject, bankType, language, questionId, questionSubject, questionAnswer, questionGradingPrompt) =>
              navigate.toEditQuestion(bankId, subject, bankType, language, questionId, questionSubject, questionAnswer, questionGradingPrompt, view.returnTo)
            }
            onStartPractice={(session, bankId, subject, bankType, language) =>
              navigate.toPractice(
                session,
                bankId,
                subject,
                bankType,
                language,
                view.returnTo
              )
            }
          />
        )}

        {/* Add Question (Full Page) */}
        {view.type === "addQuestion" && (
          <AddQuestionView
            bankSubject={view.bankSubject}
            bankType={view.bankType}
            bankLanguage={view.bankLanguage}
            onSave={async (question, answer, gradingPrompt) => {
              await api.addQuestion(view.bankId, question, answer, gradingPrompt);
              navigate.toBank(view.bankId, view.returnTo);
            }}
            onCancel={() => navigate.toBank(view.bankId, view.returnTo)}
          />
        )}

        {/* Edit Question (Full Page) */}
        {view.type === "editQuestion" && (
          <AddQuestionView
            bankSubject={view.bankSubject}
            bankType={view.bankType}
            bankLanguage={view.bankLanguage}
            initialQuestion={{
              subject: view.questionSubject,
              expectedAnswer: view.questionAnswer,
              gradingPrompt: view.questionGradingPrompt,
            }}
            onSave={async (question, answer, gradingPrompt) => {
              await api.updateQuestion(view.bankId, view.questionId, question, answer, gradingPrompt);
              navigate.toBank(view.bankId, view.returnTo);
            }}
            onCancel={() => navigate.toBank(view.bankId, view.returnTo)}
          />
        )}

        {/* Practice Session */}
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
                view.bankLanguage,
                view.returnTo
              )
            }
            onCancel={() => navigate.toMain(view.returnTo)}
          />
        )}

        {/* Results */}
        {view.type === "results" && (
          <Results
            results={view.results}
            questions={view.questions}
            bankSubject={view.bankSubject}
            bankType={view.bankType}
            bankLanguage={view.bankLanguage}
            onBack={async () => {
              await refreshAll();
              navigate.toMain(view.returnTo);
            }}
            onRetry={() =>
              handleRetry(
                view.bankId,
                view.questions.map((q) => q.id),
                view.bankSubject,
                view.bankType,
                view.bankLanguage,
                view.returnTo
              )
            }
          />
        )}

        {/* Simulation */}
        {view.type === "simulate" && (
          <SimulationView onBack={() => navigate.toMain(view.returnTo)} />
        )}

        {/* AI Generate Questions */}
        {view.type === "generateQuestions" && (
          <AIGenerateView onBack={() => navigate.toMain(view.returnTo)} />
        )}
      </main>
    </div>
  );
}

export default App;
