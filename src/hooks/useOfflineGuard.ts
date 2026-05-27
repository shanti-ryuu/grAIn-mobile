import { useCallback } from "react";

import { useServerStatus } from "@/context/ServerStatusContext";
import { useToast } from "@/context/ToastContext";
import { haptics } from "@/utils/haptics";

const OFFLINE_MESSAGE = "Remote controls are unavailable while the server or dryer is offline.";

export function useOfflineGuard(deviceOnline = true) {
  const { isServerOnline } = useServerStatus();
  const { showToast } = useToast();
  const canInteract = isServerOnline && deviceOnline;

  const warnOffline = useCallback((message = OFFLINE_MESSAGE) => {
    void haptics.warning();
    showToast(message, "warning");
  }, [showToast]);

  const guard = useCallback(
    <Args extends unknown[]>(action: (...args: Args) => void | Promise<void>, message?: string) =>
      (...args: Args) => {
        if (!canInteract) {
          warnOffline(message);
          return;
        }
        void action(...args);
      },
    [canInteract, warnOffline],
  );

  return { canInteract, guard, warnOffline };
}
