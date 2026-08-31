import type { BankType } from "../../types";
import { CodeEditor } from "../CodeEditor";
import { TerminalEditor } from "../TerminalEditor";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { GradingPromptField } from "./GradingPromptField";
import { CheckIcon, PencilIcon, TrashIcon } from "./icons";
import type { DraftField, DraftQuestion } from "./types";

type Props = {
  question: DraftQuestion;
  /** Display position only — the card is keyed and edited by id. */
  index: number;
  bankType: BankType;
  language: string | null;
  isEditing: boolean;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (field: DraftField, value: string) => void;
};

export function DraftQuestionCard(props: Props) {
  return props.isEditing ? <EditingCard {...props} /> : <ReadOnlyCard {...props} />;
}

function EditingCard({
  question,
  index,
  bankType,
  language,
  onEdit,
  onDelete,
  onUpdate,
}: Props) {
  return (
    <div className="aigen-question-card aigen-question-card--editing">
      <div className="aigen-question-number">{index + 1}</div>
      <div className="aigen-question-content">
        <div className="aigen-question-field">
          <label>Question</label>
          <AutoResizeTextarea
            value={question.subject}
            onChange={(e) => onUpdate("subject", e.target.value)}
            placeholder="Enter question..."
            autoFocus
            minRows={1}
          />
        </div>
        <div className="aigen-question-field">
          <label>Expected Answer</label>
          <AnswerEditor
            bankType={bankType}
            language={language}
            value={question.expected_answer}
            onChange={(v) => onUpdate("expected_answer", v)}
          />
        </div>
        <GradingPromptField
          value={question.grading_prompt}
          bankType={bankType}
          onChange={(v) => onUpdate("grading_prompt", v)}
        />
      </div>
      <div className="aigen-question-actions">
        <button
          type="button"
          className="aigen-action-btn aigen-action-btn--done"
          title="Done editing"
          aria-label="Done editing"
          onClick={onEdit}
        >
          <CheckIcon />
        </button>
        <button
          type="button"
          className="aigen-action-btn aigen-action-btn--delete"
          title="Delete question"
          aria-label="Delete question"
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

/** The answer input matches the bank type: prose, a command, or code. */
function AnswerEditor({
  bankType,
  language,
  value,
  onChange,
}: {
  bankType: BankType;
  language: string | null;
  value: string;
  onChange: (value: string) => void;
}) {
  if (bankType === "theory") {
    return (
      <AutoResizeTextarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter expected answer..."
        minRows={2}
      />
    );
  }

  if (bankType === "cli") {
    return (
      <TerminalEditor
        value={value}
        onChange={onChange}
        placeholder="Enter expected command..."
        height="100px"
      />
    );
  }

  return (
    <CodeEditor
      value={value}
      onChange={onChange}
      language={language || "plaintext"}
      height="120px"
    />
  );
}

function ReadOnlyCard({
  question,
  index,
  bankType,
  selectMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div
      className={`aigen-question-card ${isSelected ? "aigen-question-card--selected" : ""}`}
      onClick={selectMode ? onToggleSelect : onEdit}
    >
      {selectMode ? (
        <div
          className={`aigen-question-checkbox ${
            isSelected ? "aigen-question-checkbox--checked" : ""
          }`}
        >
          {isSelected && <CheckIcon size={12} strokeWidth={3} />}
        </div>
      ) : (
        <div className="aigen-question-number">{index + 1}</div>
      )}
      <div className="aigen-question-content">
        <div className="aigen-question-subject">
          {question.subject || "(empty question)"}
        </div>
        <div className="aigen-question-answer">
          {bankType === "theory" ? (
            question.expected_answer || "(empty answer)"
          ) : (
            <code>{question.expected_answer || "(empty answer)"}</code>
          )}
        </div>
        {question.grading_prompt && (
          <div className="aigen-question-grading">
            <PencilIcon size={10} />
            Custom grading rules
          </div>
        )}
      </div>
      {!selectMode && (
        <div className="aigen-question-actions">
          <button
            type="button"
            className="aigen-action-btn"
            title="Edit question"
            aria-label="Edit question"
            onClick={(e) => {
              // The card body already opens the editor; don't fire it twice.
              e.stopPropagation();
              onEdit();
            }}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className="aigen-action-btn aigen-action-btn--delete"
            title="Delete question"
            aria-label="Delete question"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}
