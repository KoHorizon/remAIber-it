import { useState, useEffect } from "react";
import { api } from "../../api";
import { useLibraryData, useLibraryActions } from "../../context";
import type { Bank, BankRef, QuestionDraft, Session } from "../../types";
import { Button } from "../ui";
import { SessionConfigModal } from "../modals";
import { BankHeader } from "./BankHeader";
import { QuestionCard } from "./QuestionCard";
import { DeleteQuestionModal } from "./DeleteQuestionModal";
import "../BankDetail.css";

type Props = {
  bankId: string;
  onBack: () => void;
  onAddQuestion: (bank: BankRef) => void;
  onEditQuestion: (bank: BankRef, question: QuestionDraft) => void;
  onStartPractice: (session: Session, bank: BankRef) => void;
};

/** Narrows the loaded bank to what the callbacks above carry. */
function toBankRef(bank: Bank): BankRef {
  return {
    id: bank.id,
    subject: bank.subject,
    type: bank.bank_type,
    language: bank.language,
  };
}

export function BankDetail({ bankId, onBack, onAddQuestion, onEditQuestion, onStartPractice }: Props) {
  const { getCategoryName: getCategory } = useLibraryData();
  const { refreshBank } = useLibraryActions();

  const [bank, setBank] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionConfig, setShowSessionConfig] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Inlined rather than a hoisted helper: it had one caller, and as a plain
  // function declaration it was re-created every render, so listing it as a
  // dependency would have reloaded the bank on every render.
  useEffect(() => {
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
    loadBank();
  }, [bankId]);

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
      onStartPractice(session, toBankRef(bank));
    } catch (err: unknown) {
      console.error("Failed to start session:", err);
    } finally {
      setIsStartingSession(false);
    }
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
        <Button variant="secondary" onClick={onBack}>
          Go Back
        </Button>
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
        onAddQuestion={() => onAddQuestion(toBankRef(bank))}
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
              isExpanded={expandedAnswers.has(q.id)}
              onToggleExpand={() => toggleExpanded(q.id)}
              onEdit={() =>
                onEditQuestion(toBankRef(bank), {
                  id: q.id,
                  subject: q.subject,
                  answer: q.expected_answer ?? "",
                  gradingPrompt: q.grading_prompt,
                })
              }
              onDelete={() => setShowDeleteConfirm(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
