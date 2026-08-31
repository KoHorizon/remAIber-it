import { useEffect, useId, useRef, type ReactNode } from "react";
import "./Modal.css";

type Props = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  variant?: "default" | "delete";
  showCloseButton?: boolean;
};

// Open modals, oldest first. Escape closes only the last one, so a stacked
// modal doesn't dismiss everything underneath it in one press.
const openModals: object[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  title,
  children,
  actions,
  onClose,
  variant = "default",
  showCloseButton = true,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Held in a ref so a re-rendered onClose doesn't re-register the listener.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const token = {};
    openModals.push(token);

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first control in the dialog, falling back to the dialog itself
    // (tabIndex={-1}) when it has none — otherwise focus stays on whatever is
    // behind the modal and the trap below has nothing to work with.
    const dialog = dialogRef.current;
    const firstControl = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (firstControl ?? dialog)?.focus();

    // Capture phase, and stopPropagation on the keys we own: views register
    // their view-level shortcuts on the document (see useViewShortcuts), and an
    // Escape that reached those would navigate the whole view away, unmounting
    // the modal along with it. Capture runs before any bubble-phase listener
    // regardless of which mounted first.
    function handleKeyDown(e: KeyboardEvent) {
      if (openModals[openModals.length - 1] !== token) return;

      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        // Only the wrap-around edges are handled; everything in between is the
        // browser's own tab order.
        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
          e.preventDefault();
          last.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      openModals.splice(openModals.indexOf(token), 1);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal ${variant === "delete" ? "modal-delete" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          {showCloseButton && (
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
