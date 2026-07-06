"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToast } from "@/lib/toast";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon size={16} />
            <span>{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} aria-label="Закрыть">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}