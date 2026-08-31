import type { BankType } from "../../types";
import { Button } from "../ui";
import { DraftQuestionCard } from "./DraftQuestionCard";
import { PlusIcon, SparkleIcon } from "./icons";
import type { QuestionDrafts } from "./useQuestionDrafts";

type Props = {
  drafts: QuestionDrafts;
  bankType: BankType;
  language: string | null;
  isGenerating: boolean;
  onClearAll: () => void;
};

export function DraftQuestionList({
  drafts,
  bankType,
  language,
  isGenerating,
  onClearAll,
}: Props) {
  const { questions } = drafts;

  return (
    <div className="aigen-right">
      <div className="aigen-questions-header">
        <h2>Generated Questions</h2>
        <div className="aigen-questions-header-actions">
          {questions.length > 0 &&
            (drafts.selectMode ? (
              <>
                <span className="aigen-select-count">
                  {drafts.selectedIds.size} selected
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={drafts.deleteSelected}
                  disabled={drafts.selectedIds.size === 0}
                >
                  Delete Selected
                </Button>
                <Button variant="ghost" size="sm" onClick={drafts.exitSelectMode}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={drafts.enterSelectMode}>
                  Select
                </Button>
                <Button variant="ghost" size="sm" onClick={onClearAll}>
                  Clear All
                </Button>
              </>
            ))}
          <span className="aigen-questions-count">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {questions.length === 0 ? (
        <EmptyState isGenerating={isGenerating} />
      ) : (
        <div className="aigen-questions-list">
          {questions.map((q, index) => (
            <DraftQuestionCard
              key={q.id}
              question={q}
              index={index}
              bankType={bankType}
              language={language}
              isEditing={drafts.editingId === q.id}
              selectMode={drafts.selectMode}
              isSelected={drafts.selectedIds.has(q.id)}
              onToggleSelect={() => drafts.toggleSelect(q.id)}
              onEdit={() => drafts.toggleEdit(q.id)}
              onDelete={() => drafts.remove(q.id)}
              onUpdate={(field, value) => drafts.update(q.id, field, value)}
            />
          ))}
          <button
            type="button"
            className="aigen-add-question"
            onClick={drafts.add}
          >
            <PlusIcon size={16} />
            Add Question
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ isGenerating }: { isGenerating: boolean }) {
  return (
    <div className="aigen-empty">
      <SparkleIcon
        size={48}
        strokeWidth={1.5}
        className={isGenerating ? "aigen-empty-icon--spinning" : ""}
      />
      <p>
        {isGenerating
          ? "Generating questions..."
          : "Generated questions will appear here"}
      </p>
      <span>
        {isGenerating
          ? "This may take a moment"
          : "Paste your study material and click Generate"}
      </span>
    </div>
  );
}
