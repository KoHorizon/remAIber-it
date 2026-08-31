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
import type {
  BankRef,
  QuestionDraft,
  Session,
  SessionQuestion,
  SessionResult,
} from "./types";
import "./App.css";

type MainView = "dashboard" | "library" | "settings";

// Five of these variants need the same four bank fields, so they carry one
// `bank: BankRef` instead of repeating id/subject/type/language each time.
// That's also what keeps the navigate functions below down to two or three
// arguments — toEditQuestion used to take nine, six of them adjacent strings.
type View =
  | { type: "main"; mainView: MainView }
  | { type: "bank"; bankId: string; returnTo: MainView }
  | { type: "addQuestion"; bank: BankRef; returnTo: MainView }
  | {
      type: "editQuestion";
      bank: BankRef;
      question: QuestionDraft;
      returnTo: MainView;
    }
  | { type: "practice"; session: Session; bank: BankRef; returnTo: MainView }
  | {
      type: "results";
      results: SessionResult;
      questions: SessionQuestion[];
      bank: BankRef;
      returnTo: MainView;
    }
  | { type: "simulate"; returnTo: MainView }
  | { type: "generateQuestions"; returnTo: MainView };

function App() {
  const { refreshAll } = useLibraryActions();
  const [view, setView] = useState<View>({ type: "main", mainView: "dashboard" });

  const currentMainView = view.type === "main" ? view.mainView : "dashboard";

  const navigate = {
    toMain: (mainView: MainView) => setView({ type: "main", mainView }),
    toBank: (bankId: string, returnTo: MainView = currentMainView) =>
      setView({ type: "bank", bankId, returnTo }),
    toAddQuestion: (bank: BankRef, returnTo: MainView = currentMainView) =>
      setView({ type: "addQuestion", bank, returnTo }),
    toEditQuestion: (
      bank: BankRef,
      question: QuestionDraft,
      returnTo: MainView = currentMainView
    ) => setView({ type: "editQuestion", bank, question, returnTo }),
    toPractice: (
      session: Session,
      bank: BankRef,
      returnTo: MainView = currentMainView
    ) => setView({ type: "practice", session, bank, returnTo }),
    toResults: (
      results: SessionResult,
      questions: SessionQuestion[],
      bank: BankRef,
      returnTo: MainView = currentMainView
    ) => setView({ type: "results", results, questions, bank, returnTo }),
    toSimulate: (returnTo: MainView = currentMainView) =>
      setView({ type: "simulate", returnTo }),
    toGenerateQuestions: (returnTo: MainView = currentMainView) =>
      setView({ type: "generateQuestions", returnTo }),
  };

  async function handleRetry(
    bank: BankRef,
    questionIds: string[],
    returnTo: MainView = currentMainView
  ) {
    try {
      const session = await api.createSession(bank.id, {
        question_ids: questionIds,
      });
      navigate.toPractice(session, bank, returnTo);
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
        {
          id: "multi", // Special marker for multi-bank sessions
          subject: "Quick Practice",
          type: "theory", // Default; individual questions carry their own type
          language: null,
        },
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
            onAddQuestion={(bank) => navigate.toAddQuestion(bank, view.returnTo)}
            onEditQuestion={(bank, question) =>
              navigate.toEditQuestion(bank, question, view.returnTo)
            }
            onStartPractice={(session, bank) =>
              navigate.toPractice(session, bank, view.returnTo)
            }
          />
        )}

        {/* Add Question (Full Page) */}
        {view.type === "addQuestion" && (
          <AddQuestionView
            bankSubject={view.bank.subject}
            bankType={view.bank.type}
            bankLanguage={view.bank.language}
            onSave={async (question, answer, gradingPrompt) => {
              await api.addQuestion(view.bank.id, question, answer, gradingPrompt);
              navigate.toBank(view.bank.id, view.returnTo);
            }}
            onCancel={() => navigate.toBank(view.bank.id, view.returnTo)}
          />
        )}

        {/* Edit Question (Full Page) */}
        {view.type === "editQuestion" && (
          <AddQuestionView
            bankSubject={view.bank.subject}
            bankType={view.bank.type}
            bankLanguage={view.bank.language}
            initialQuestion={{
              subject: view.question.subject,
              expectedAnswer: view.question.answer,
              gradingPrompt: view.question.gradingPrompt,
            }}
            onSave={async (question, answer, gradingPrompt) => {
              await api.updateQuestion(
                view.bank.id,
                view.question.id,
                question,
                answer,
                gradingPrompt
              );
              navigate.toBank(view.bank.id, view.returnTo);
            }}
            onCancel={() => navigate.toBank(view.bank.id, view.returnTo)}
          />
        )}

        {/* Practice Session */}
        {view.type === "practice" && (
          <PracticeSession
            session={view.session}
            bankSubject={view.bank.subject}
            bankType={view.bank.type}
            bankLanguage={view.bank.language}
            onComplete={(results) =>
              navigate.toResults(
                results,
                view.session.questions,
                view.bank,
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
            bankSubject={view.bank.subject}
            bankType={view.bank.type}
            bankLanguage={view.bank.language}
            onBack={async () => {
              await refreshAll();
              navigate.toMain(view.returnTo);
            }}
            onRetry={() =>
              handleRetry(
                view.bank,
                view.questions.map((q) => q.id),
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
