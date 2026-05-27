import { createContext, ReactNode, useContext, useMemo } from "react";

interface DeviceContextValue {
  refreshDevices: () => void;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const value = useMemo<DeviceContextValue>(() => ({ refreshDevices: () => undefined }), []);
  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDeviceContext(): DeviceContextValue {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error("useDeviceContext must be used within DeviceProvider");
  }
  return context;
}
