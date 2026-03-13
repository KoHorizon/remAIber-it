import { useState } from "react";

type Props = {
  onCreateCategory: (name: string) => Promise<void>;
};

export function LibraryEmpty({ onCreateCategory }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      setIsCreating(false);
      return;
    }
    try {
      await onCreateCategory(name.trim());
      setName("");
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to create category:", err);
    }
  }

  return (
    <div className="library-empty">
      <div className="library-empty-icon">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>
      <h2 className="library-empty-title">Your library is empty</h2>
      <p className="library-empty-text">
        Create your first category to start organizing your question banks.
      </p>
      {isCreating ? (
        <div className="library-empty-input">
          <input
            type="text"
            className="input"
            placeholder="Category name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              else if (e.key === "Escape") {
                setIsCreating(false);
                setName("");
              }
            }}
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleCreate}>
            Create
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setIsCreating(false);
              setName("");
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          Create Category
        </button>
      )}
    </div>
  );
}
