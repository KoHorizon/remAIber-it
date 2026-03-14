import { useState } from "react";
import type { BankType } from "../../types";
import { PROGRAMMING_LANGUAGES } from "../../utils/languages";
import "./CreateBankModal.css";

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

  const isValid = subject.trim() && (bankType !== "code" || language);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cbm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cbm-header">
          <div className="cbm-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className="cbm-header-title">
            <h2>New Question Bank</h2>
          </div>
          <button type="button" className="cbm-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form id="create-bank-form" onSubmit={handleSubmit}>
          <div className="cbm-content">
            {/* Subject Input */}
            <div className="cbm-field">
              <label className="cbm-label">Subject</label>
              <input
                type="text"
                className="cbm-input"
                placeholder="e.g., Go Fundamentals, React Hooks"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                autoFocus
              />
            </div>

            {/* Bank Type */}
            <div className="cbm-field">
              <label className="cbm-label">Bank Type</label>
              <div className="cbm-types">
                <button
                  type="button"
                  className={`cbm-type ${bankType === "theory" ? "active" : ""}`}
                  onClick={() => setBankType("theory")}
                >
                  <span className="cbm-type-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </span>
                  <span className="cbm-type-name">Theory</span>
                  <span className="cbm-type-desc">concepts, definitions</span>
                </button>
                <button
                  type="button"
                  className={`cbm-type ${bankType === "code" ? "active" : ""}`}
                  onClick={() => setBankType("code")}
                >
                  <span className="cbm-type-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </span>
                  <span className="cbm-type-name">Code</span>
                  <span className="cbm-type-desc">syntax, programming</span>
                </button>
                <button
                  type="button"
                  className={`cbm-type ${bankType === "cli" ? "active" : ""}`}
                  onClick={() => setBankType("cli")}
                >
                  <span className="cbm-type-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                  </span>
                  <span className="cbm-type-name">CLI</span>
                  <span className="cbm-type-desc">commands, terminal</span>
                </button>
              </div>
            </div>

            {/* Language Selection (for code type) */}
            {bankType === "code" && (
              <div className="cbm-field">
                <label className="cbm-label">Programming Language</label>
                <div className="cbm-languages">
                  {PROGRAMMING_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      className={`cbm-lang ${language === lang.value ? "active" : ""}`}
                      onClick={() => setLanguage(lang.value)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="cbm-footer">
            <button
              type="button"
              className="cbm-btn cbm-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cbm-btn cbm-btn-create"
              disabled={!isValid || isCreating}
            >
              {isCreating ? "Creating..." : "Create Bank"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
