import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Modal body content (children). Title and footer should be passed via JSX. */
  children: ReactNode;
  /** Width in pixels. Default 480. */
  width?: number;
  /** Optional aria-label for the dialog. */
  ariaLabel?: string;
};

/**
 * Mundus Modal — generic dialog rendered into document.body via portal.
 *
 * - Closes on backdrop click, ESC key, and X button.
 * - Locks body scroll while open.
 * - Conforms to the .modal / .modal-backdrop / .modal-close CSS classes
 *   from mundus-modal.css.
 */
export function Modal({
  open,
  onClose,
  children,
  width = 480,
  ariaLabel,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <XIcon size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
