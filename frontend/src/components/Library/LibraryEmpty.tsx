type Props = {
  onCreateCategory: () => void;
};

export function LibraryEmpty({ onCreateCategory }: Props) {
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
      <button className="btn btn-primary" onClick={onCreateCategory}>
        Create Category
      </button>
    </div>
  );
}
