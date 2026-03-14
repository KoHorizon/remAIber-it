import { useState, useEffect } from "react";
import { api } from "../../api";
import { useLibrary } from "../../context/LibraryContext";
import type { Bank, Session, BankType } from "../../types";
import { SessionConfigModal, GradingSettingsModal } from "../modals";
import { BankHeader } from "./BankHeader";
import { QuestionCard } from "./QuestionCard";
import { DeleteQuestionModal } from "./DeleteQuestionModal";
import "../BankDetail.css";

type Props = {
  bankId: string;
  onBack: () => void;
  onAddQuestion: (
    bankId: string,
    bankSubject: string,
    bankType: BankType,
    bankLanguage?: string | null,
    bankGradingPrompt?: string | null
  ) => void;
  onStartPractice: (
    session: Session,
    bankId: string,
    bankSubject: string,
    bankType: BankType,
    bankLanguage?: string | null
  ) => void;
};

export function BankDetail({ bankId, onBack, onAddQuestion, onStartPractice }: Props) {
  const { getCategoryName: getCategory, refreshBank } = useLibrary();

  const [bank, setBank] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionConfig, setShowSessionConfig] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showGradingSettings, setShowGradingSettings] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  useEffect(() => {
    loadBank();
  }, [bankId]);

  async function loadBank() {
    setIsLoading(true);
    try {
      const bankData = await api.getBank(bankId);
      setBank(bankData);
    } catch (err: unknown) {
      console.error("Failed to load bank:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await api.deleteQuestion(bankId, questionId);
      const updated = await refreshBank(bankId);
      if (updated) setBank(updated);
    } catch (err: unknown) {
      console.error("Failed to delete question:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  }

  async function handleStartSession(config: {
    maxQuestions?: number;
    maxDurationMin?: number;
    focusOnWeak?: boolean;
  }) {
    if (!bank || isStartingSession) return;

    setIsStartingSession(true);
    setShowSessionConfig(false);

    try {
      const session = await api.createSession(bankId, {
        max_questions: config.maxQuestions,
        max_duration_min: config.maxDurationMin,
        focus_on_weak: config.focusOnWeak,
      });
      onStartPractice(session, bankId, bank.subject, bank.bank_type, bank.language);
    } catch (err: unknown) {
      console.error("Failed to start session:", err);
    } finally {
      setIsStartingSession(false);
    }
  }

  async function handleSaveGradingPrompt(prompt: string | null) {
    if (!bank) return;
    await api.updateBankGradingPrompt(bankId, prompt);
    setBank({ ...bank, grading_prompt: prompt });
  }

  function toggleExpanded(questionId: string) {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  function getCategoryName(): string | null {
    if (!bank?.category_id) return null;
    const name = getCategory(bank.category_id);
    return name === "Uncategorized" ? null : name;
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="bank-detail animate-fade-in">
        <p>Bank not found</p>
        <button className="btn btn-secondary" onClick={onBack}>
          Go Back
        </button>
      </div>
    );
  }

  const questions = bank.questions || [];
  const categoryName = getCategoryName();

  return (
    <div className="bank-detail animate-fade-in">
      <BankHeader
        bank={bank}
        categoryName={categoryName}
        questionCount={questions.length}
        isStartingSession={isStartingSession}
        onBack={onBack}
        onAddQuestion={() =>
          onAddQuestion(
            bankId,
            bank.subject,
            bank.bank_type,
            bank.language,
            bank.grading_prompt
          )
        }
        onOpenGradingSettings={() => setShowGradingSettings(true)}
        onOpenSessionConfig={() => setShowSessionConfig(true)}
      />

      {/* Modals */}
      {showSessionConfig && (
        <SessionConfigModal
          totalQuestions={questions.length}
          onStart={handleStartSession}
          onCancel={() => setShowSessionConfig(false)}
        />
      )}

      {showGradingSettings && (
        <GradingSettingsModal
          bankType={bank.bank_type}
          currentPrompt={bank.grading_prompt || null}
          onClose={() => setShowGradingSettings(false)}
          onSave={handleSaveGradingPrompt}
        />
      )}

      {showDeleteConfirm && (
        <DeleteQuestionModal
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDeleteQuestion(showDeleteConfirm)}
        />
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">?</div>
          <p className="empty-state-text">
            Add questions to this bank to start practicing.
          </p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((q, index) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={index}
              bankType={bank.bank_type}
              bankLanguage={bank.language}
              bankGradingPrompt={bank.grading_prompt}
              isExpanded={expandedAnswers.has(q.id)}
              onToggleExpand={() => toggleExpanded(q.id)}
              onDelete={() => setShowDeleteConfirm(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
