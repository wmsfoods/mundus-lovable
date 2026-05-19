import { AlertIcon } from "@/components/icons";

type ToastProps = {
  title?: string;
  message: string;
  onClose: () => void;
};

export function Toast({ title, message, onClose }: ToastProps) {
  return (
    <div className="toast" role="alert">
      <span className="toast-icon">
        <AlertIcon size={14} stroke="currentColor" />
      </span>
      <div className="toast-body">
        {title && <div className="toast-title">{title}</div>}
        <div>{message}</div>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
