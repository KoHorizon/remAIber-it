import { useState } from "react";
import type { BankType } from "../../types";
import { PROGRAMMING_LANGUAGES } from "../../utils/languages";

type Props = {
  categoryId: string;
  onClose: () => void;
  onCreate: (
    subject: string,
    categoryId: string,
    bankType: BankType,
    language?: string
  ) => Promise<void>;
};

export function CreateBankModal({ categoryId, onClose, onCreate }: Props) {
  const [subject, setSubject] = useState("");
  const [bankType, setBankType] = useState<BankType>("theory");
  const [language, setLanguage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || isCreating) return;
    if (bankType === "code" && !language) return;

    setIsCreating(true);
    try {
      await onCreate(
        subject.trim(),
        categoryId,
        bankType,
        bankType === "code" ? language : undefined
      );
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create bank:", err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Question Bank</h2>
        <form onSubmit={handleSubmit}>
          <label className="input-label" htmlFor="bank-subject">
            Subject
          </label>
          <input
            id="bank-subject"
            type="text"
            className="input"
            placeholder="e.g., Go Fundamentals, React Hooks"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            autoFocus
          />

          <label className="input-label">Bank Type</label>
          <div className="type-selector">
            <button
              type="button"
              className={`type-btn ${bankType === "theory" ? "active" : ""}`}
              onClick={() => setBankType("theory")}
            >
              <span className="type-icon">📝</span>
              <span className="type-name">Theory</span>
              <span className="type-desc">concepts, definitions</span>
            </button>
            <button
              type="button"
              className={`type-btn ${bankType === "code" ? "active" : ""}`}
              onClick={() => setBankType("code")}
            >
              <span className="type-icon">💻</span>
              <span className="type-name">Code</span>
              <span className="type-desc">syntax, programming</span>
            </button>
            <button
              type="button"
              className={`type-btn ${bankType === "cli" ? "active" : ""}`}
              onClick={() => setBankType("cli")}
            >
              <span className="type-icon">⌨️</span>
              <span className="type-name">CLI</span>
              <span className="type-desc">commands, terminal</span>
            </button>
          </div>

          {bankType === "code" && (
            <>
              <label className="input-label">Programming Language</label>
              <div className="language-selector">
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    className={`lang-btn ${language === lang.value ? "active" : ""}`}
                    onClick={() => setLanguage(lang.value)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                !subject.trim() ||
                isCreating ||
                (bankType === "code" && !language)
              }
            >
              {isCreating ? "Creating..." : "Create Bank"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
