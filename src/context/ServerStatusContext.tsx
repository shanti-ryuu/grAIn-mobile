import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";

import { grainApi } from "@/api/grain-api-client";
import { useToast } from "@/context/ToastContext";
import { API_TIMEOUT } from "@/utils/constants";
import { flushQueue, getQueueCount, QueuedCommand, subscribeQueueCount } from "@/utils/commandQueue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface ServerStatusContextValue {
  isServerOnline: boolean;
  serverStatus: string;
  queuedCommandCount: number;
}

const ServerStatusContext = createContext<ServerStatusContextValue | undefined>(undefined);

async function executeQueuedCommand(command: QueuedCommand): Promise<void> {
  const { deviceId, commandType, payload } = command;

  if (commandType === "dryer.start") {
    await grainApi.dryer.start(
      deviceId,
      payload.mode === "AUTO" ? "AUTO" : "MANUAL",
      typeof payload.temperature === "number" ? payload.temperature : undefined,
      typeof payload.fanSpeed === "number" ? payload.fanSpeed : undefined,
    );
    return;
  }

  if (commandType === "dryer.stop") {
    await grainApi.dryer.stop(deviceId);
    return;
  }

  throw new Error(`Unsupported queued command: ${commandType}`);
}

export function ServerStatusProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useNetworkStatus();
  const { showToast } = useToast();
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [serverStatus, setServerStatus] = useState("unknown");
  const [queuedCommandCount, setQueuedCommandCount] = useState(0);
  const wasOfflineRef = useRef(false);
  const lastKnownOnlineRef = useRef(true);

  useEffect(() => {
    let mounted = true;

    const checkServer = async () => {
      if (!isConnected) {
        setServerStatus((current) => (current === "offline" ? current : "offline"));
        setIsServerOnline((current) => (current ? false : current));
        wasOfflineRef.current = true;
        lastKnownOnlineRef.current = false;
        return;
      }

      try {
        await grainApi.health.check(API_TIMEOUT.HEALTH);
        if (!mounted) {
          return;
        }
        setServerStatus((current) => (current === "healthy" ? current : "healthy"));
        setIsServerOnline((current) => (current ? current : true));

        if (!lastKnownOnlineRef.current) {
          lastKnownOnlineRef.current = true;
          void flushQueue(executeQueuedCommand).then(getQueueCount).then((count) => {
            if (mounted) {
              setQueuedCommandCount(count);
            }
          });
          if (wasOfflineRef.current) {
            showToast("Back online", "success");
            wasOfflineRef.current = false;
          }
        }
      } catch {
        if (mounted) {
          setServerStatus((current) => (current === "offline" ? current : "offline"));
          setIsServerOnline((current) => (current ? false : current));
          wasOfflineRef.current = true;
          lastKnownOnlineRef.current = false;
        }
      }
    };

    void checkServer();
    const interval = setInterval(checkServer, 30000);
    const queueInterval = setInterval(() => {
      void getQueueCount().then((count) => {
        if (mounted) {
          setQueuedCommandCount(count);
        }
      });
    }, 5000);
    const unsubscribe = subscribeQueueCount((count) => {
      if (mounted) {
        setQueuedCommandCount(count);
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(queueInterval);
      unsubscribe();
    };
  }, [isConnected, showToast]);

  const value = useMemo(
    () => ({ isServerOnline, serverStatus, queuedCommandCount }),
    [isServerOnline, queuedCommandCount, serverStatus],
  );

  return <ServerStatusContext.Provider value={value}>{children}</ServerStatusContext.Provider>;
}

export function useServerStatus(): ServerStatusContextValue {
  const context = useContext(ServerStatusContext);
  if (!context) {
    throw new Error("useServerStatus must be used within ServerStatusProvider");
  }
  return context;
}
