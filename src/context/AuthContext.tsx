import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AuthUser, GRAIN_TOKEN_KEY, grainApi } from "@/api/grain-api-client";
import { addLogoutListener } from "@/utils/authEvents";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReconnecting: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (name: string, email: string, password: string, role?: "admin" | "farmer") => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function clearControlCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const controlKeys = keys.filter((key) => key.startsWith("control_"));
  if (controlKeys.length > 0) {
    await AsyncStorage.multiRemove(controlKeys);
  }
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("unauthorized");
}

async function retryMe(maxAttempts: number, delayMs: number): Promise<AuthUser> {
  let latestError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await grainApi.auth.me(30000);
    } catch (error) {
      latestError = error;
      if (isUnauthorized(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw latestError;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopBackgroundRetry = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
  }, []);

  const startBackgroundRetry = useCallback(() => {
    if (retryIntervalRef.current) {
      return;
    }

    setIsReconnecting(true);
    retryIntervalRef.current = setInterval(() => {
      void grainApi.auth
        .me(30000)
        .then((currentUser) => {
          setUser(currentUser);
          setIsAuthenticated(true);
          setIsReconnecting(false);
          setError(null);
          stopBackgroundRetry();
        })
        .catch((retryError: unknown) => {
          if (isUnauthorized(retryError)) {
            void SecureStore.deleteItemAsync(GRAIN_TOKEN_KEY);
            setUser(null);
            setIsAuthenticated(false);
            setIsReconnecting(false);
            stopBackgroundRetry();
          }
        });
    }, 10000);
  }, [stopBackgroundRetry]);

  const logout = useCallback(async () => {
    stopBackgroundRetry();
    try {
      await grainApi.auth.logout();
    } catch {
      // Best-effort server logout.
    }
    await SecureStore.deleteItemAsync(GRAIN_TOKEN_KEY);
    await clearControlCache();
    setUser(null);
    setIsAuthenticated(false);
    setIsReconnecting(false);
    setError(null);
  }, [stopBackgroundRetry]);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = await SecureStore.getItemAsync(GRAIN_TOKEN_KEY);

    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await retryMe(3, 5000);
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (bootstrapError) {
      if (isUnauthorized(bootstrapError)) {
        await SecureStore.deleteItemAsync(GRAIN_TOKEN_KEY);
        setUser(null);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
        setError("Server is reconnecting. You can keep using cached access.");
        startBackgroundRetry();
      }
    } finally {
      setIsLoading(false);
    }
  }, [startBackgroundRetry]);

  useEffect(() => {
    void bootstrap();
    const unsubscribe = addLogoutListener(() => {
      void logout();
    });
    return () => {
      unsubscribe();
      stopBackgroundRetry();
    };
  }, [bootstrap, logout, stopBackgroundRetry]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const response = await grainApi.auth.login(email, password);
    await SecureStore.setItemAsync(GRAIN_TOKEN_KEY, response.accessToken);
    setUser(response.user);
    setIsAuthenticated(true);
    return response.user;
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string, role: "admin" | "farmer" = "farmer") => {
      setError(null);
      const response = await grainApi.auth.register(name, email, password, role);
      await SecureStore.setItemAsync(GRAIN_TOKEN_KEY, response.accessToken);
      setUser(response.user);
      setIsAuthenticated(true);
      return response.user;
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      isReconnecting,
      error,
      login,
      signup,
      logout,
    }),
    [error, isAuthenticated, isLoading, isReconnecting, login, logout, signup, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
