import { useEffect } from "react";

type ToastProps = {
  type: "success" | "error" | "info";
  message: string;
  onClose: () => void;
  durationMs?: number;
};

export function Toast({ type, message, onClose, durationMs = 6000 }: ToastProps) {
  useEffect(() => {
    const id = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(id);
  }, [durationMs, onClose]);

  return (
    <div className={`toast toast--${type}`} role="status">
      <div className="toast__body">
        {type === "success" && <span className="toast__icon" aria-hidden>✓</span>}
        {type === "error" && <span className="toast__icon" aria-hidden>!</span>}
        {type === "info" && <span className="toast__icon" aria-hidden>i</span>}
        <p>{message}</p>
      </div>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Fechar">
        ×
      </button>
    </div>
  );
}
