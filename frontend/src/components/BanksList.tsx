import { useState, useEffect } from "react";
import { api, Bank } from "../App";
import "./BanksList.css";

type Props = {
  onSelectBank: (bankId: string) => void;
};

export function BanksList({ onSelectBank }: Props) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadBanks();
  }, []);

  async function loadBanks() {
    try {
      const data = await api.getBanks();
      setBanks(data);
    } catch (err) {
      console.error("Failed to load banks:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const bank = await api.createBank(newSubject.trim());
      setBanks([...banks, bank]);
      setNewSubject("");
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create bank:", err);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteBank(e: React.MouseEvent, bankId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this bank and all its questions?")) return;

    try {
      await api.deleteBank(bankId);
      setBanks(banks.filter((b) => b.id !== bankId));
    } catch (err) {
      console.error("Failed to delete bank:", err);
    }
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="banks-list animate-fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Your Question Banks</h1>
            <p className="page-subtitle">
              {banks.length === 0
                ? "Create your first question bank to start learning"
                : `${banks.length} bank${banks.length !== 1 ? "s" : ""} ready for practice`}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <span>+</span> New Bank
          </button>
        </div>
      </div>

      {showCreate && (
        <div
          className="create-modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="create-modal animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Create Question Bank</h2>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label className="input-label" htmlFor="subject">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  className="input"
                  placeholder="e.g., JavaScript Fundamentals"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newSubject.trim() || isCreating}
                >
                  {isCreating ? "Creating..." : "Create Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {banks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p className="empty-state-text">
            No question banks yet. Create one to start building your knowledge.
          </p>
        </div>
      ) : (
        <div className="banks-grid">
          {banks.map((bank, i) => (
            <div
              key={bank.id}
              className="bank-card card card-interactive"
              onClick={() => onSelectBank(bank.id)}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <button
                className="btn-delete"
                onClick={(e) => handleDeleteBank(e, bank.id)}
                title="Delete bank"
              >
                ×
              </button>
              <div className="bank-card-icon">◇</div>
              <h2 className="bank-card-title">{bank.subject}</h2>
              <div className="bank-card-meta">
                <span className="bank-card-id">ID: {bank.id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
