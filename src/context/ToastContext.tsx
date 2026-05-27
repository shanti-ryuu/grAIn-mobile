import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { Toast } from "@/components/Toast";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const activeToast = queue[0];

  const dismissToast = useCallback(() => {
    setQueue((items) => items.slice(1));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    idRef.current += 1;
    setQueue((items) => [
      ...items,
      {
        id: `toast-${idRef.current}`,
        message,
        type,
        duration,
      },
    ]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        key={activeToast?.id ?? "toast-empty"}
        message={activeToast?.message ?? ""}
        type={activeToast?.type ?? "info"}
        visible={Boolean(activeToast)}
        duration={activeToast?.duration ?? 3000}
        onDismiss={dismissToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
