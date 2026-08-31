import type { ContentItem } from "./types";
import { CloseIcon, PlusIcon } from "./icons";

/** Cards are a preview, not the content — the full text lives in the editor. */
const PREVIEW_LENGTH = 100;

type Props = {
  items: ContentItem[];
  totalCharacters: number;
  onOpen: (item?: ContentItem) => void;
  onRemove: (id: string) => void;
};

export function StudyMaterialCards({
  items,
  totalCharacters,
  onOpen,
  onRemove,
}: Props) {
  return (
    <>
      <div className="aigen-content-cards">
        {items.map((item) => (
          <div
            key={item.id}
            className="aigen-content-card"
            onClick={() => onOpen(item)}
          >
            <div className="aigen-content-card-text">
              {item.text.length > PREVIEW_LENGTH
                ? item.text.slice(0, PREVIEW_LENGTH) + "..."
                : item.text}
            </div>
            <button
              type="button"
              className="aigen-content-card-delete"
              title="Remove study material"
              aria-label="Remove study material"
              onClick={(e) => {
                // The card itself opens the editor; the X must not do both.
                e.stopPropagation();
                onRemove(item.id);
              }}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="aigen-add-content-btn"
          onClick={() => onOpen()}
        >
          <PlusIcon size={20} />
          <span>Add</span>
        </button>
      </div>
      <span className="aigen-char-count">
        {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
        {totalCharacters.toLocaleString()} characters
      </span>
    </>
  );
}
