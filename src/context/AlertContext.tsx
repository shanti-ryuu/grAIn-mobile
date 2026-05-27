import { createContext, ReactNode, useContext, useMemo } from "react";

interface AlertContextValue {
  refreshAlerts: () => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AlertContextValue>(() => ({ refreshAlerts: () => undefined }), []);
  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlertContext(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlertContext must be used within AlertProvider");
  }
  return context;
}
