import { ReactNode } from "react";

import { AlertProvider } from "@/context/AlertContext";
import { AssistantProvider } from "@/context/AssistantContext";
import { DeviceProvider } from "@/context/DeviceContext";
import { ServerStatusProvider } from "@/context/ServerStatusContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { TutorialProvider } from "@/context/TutorialContext";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <TutorialProvider>
          <ServerStatusProvider>
            <DeviceProvider>
              <AlertProvider>
                <AssistantProvider>{children}</AssistantProvider>
              </AlertProvider>
            </DeviceProvider>
          </ServerStatusProvider>
        </TutorialProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
