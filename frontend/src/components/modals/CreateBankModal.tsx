import { useState } from "react";
import type { BankType } from "../../types";
import { PROGRAMMING_LANGUAGES } from "../../utils/languages";
import { Modal, Button, Input } from "../ui";

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
    <Modal
      title="New Question Bank"
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-bank-form"
            disabled={!isValid || isCreating}
          >
            {isCreating ? "Creating..." : "Create Bank"}
          </Button>
        </>
      }
    >
      <form id="create-bank-form" onSubmit={handleSubmit}>
        <Input
          label="Subject"
          placeholder="e.g., Go Fundamentals, React Hooks"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          autoFocus
        />

        <label className="input-label">Bank Type</label>
        <div className="modal-type-selector">
          <button
            type="button"
            className={`modal-type-btn ${bankType === "theory" ? "active" : ""}`}
            onClick={() => setBankType("theory")}
          >
            <span className="icon">📝</span>
            <span className="name">Theory</span>
            <span className="desc">concepts, definitions</span>
          </button>
          <button
            type="button"
            className={`modal-type-btn ${bankType === "code" ? "active" : ""}`}
            onClick={() => setBankType("code")}
          >
            <span className="icon">💻</span>
            <span className="name">Code</span>
            <span className="desc">syntax, programming</span>
          </button>
          <button
            type="button"
            className={`modal-type-btn ${bankType === "cli" ? "active" : ""}`}
            onClick={() => setBankType("cli")}
          >
            <span className="icon">⌨️</span>
            <span className="name">CLI</span>
            <span className="desc">commands, terminal</span>
          </button>
        </div>

        {bankType === "code" && (
          <>
            <label className="input-label">Programming Language</label>
            <div className="modal-language-selector">
              {PROGRAMMING_LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  className={`modal-lang-btn ${language === lang.value ? "active" : ""}`}
                  onClick={() => setLanguage(lang.value)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
