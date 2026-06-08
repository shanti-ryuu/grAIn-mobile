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

import { AuthUser, GRAIN_TOKEN_KEY, VerificationStartResponse, grainApi } from "@/api/grain-api-client";
import { addLogoutListener } from "@/utils/authEvents";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReconnecting: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  signup: (
    name: string,
    email: string,
    password: string,
    phoneNumber?: string,
    verificationChannel?: "email" | "sms",
  ) => Promise<VerificationStartResponse>;
  verifyOtp: (payload: {
    email?: string;
    phoneNumber?: string;
    otp: string;
    verificationChannel?: "email" | "sms";
  }) => Promise<AuthUser>;
  resendOtp: (payload: { email?: string; phoneNumber?: string; verificationChannel?: "email" | "sms" }) => Promise<string>;
  forgotPassword: (identifier: string, verificationChannel?: "email" | "sms") => Promise<string>;
  resetPassword: (identifier: string, otp: string, newPassword: string, verificationChannel?: "email" | "sms") => Promise<string>;
  refreshUser: () => Promise<AuthUser>;
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
    try {
      const token = await SecureStore.getItemAsync(GRAIN_TOKEN_KEY);

      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const currentUser = await retryMe(2, 2500);
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (bootstrapError) {
      if (isUnauthorized(bootstrapError)) {
        await SecureStore.deleteItemAsync(GRAIN_TOKEN_KEY);
        setUser(null);
        setIsAuthenticated(false);
      } else {
        // Keep the app usable even when token restore can't reach the server.
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

  const login = useCallback(async (identifier: string, password: string) => {
    setError(null);
    const response = await grainApi.auth.login(identifier, password);
    await SecureStore.setItemAsync(GRAIN_TOKEN_KEY, response.accessToken);
    const currentUser = await grainApi.auth.me(30000).catch(() => response.user);
    setUser(currentUser);
    setIsAuthenticated(true);
    return currentUser;
  }, []);

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      phoneNumber?: string,
      verificationChannel: "email" | "sms" = "email",
    ) => {
      setError(null);
      return grainApi.auth.register(name, email, password, phoneNumber, verificationChannel);
    },
    [],
  );

  const verifyOtp = useCallback(async (payload: {
    email?: string;
    phoneNumber?: string;
    otp: string;
    verificationChannel?: "email" | "sms";
  }) => {
    setError(null);
    const response = await grainApi.auth.verifyOtp(payload);
    await SecureStore.setItemAsync(GRAIN_TOKEN_KEY, response.accessToken);
    const currentUser = await grainApi.auth.me(30000).catch(() => response.user);
    setUser(currentUser);
    setIsAuthenticated(true);
    return currentUser;
  }, []);

  const resendOtp = useCallback(async (payload: { email?: string; phoneNumber?: string; verificationChannel?: "email" | "sms" }) => {
    setError(null);
    const response = await grainApi.auth.resendOtp(payload);
    return response.message;
  }, []);

  const forgotPassword = useCallback(async (identifier: string, verificationChannel: "email" | "sms" = "email") => {
    setError(null);
    const response = await grainApi.auth.forgotPassword({ identifier, verificationChannel });
    return response.message;
  }, []);

  const resetPassword = useCallback(async (identifier: string, otp: string, newPassword: string, verificationChannel: "email" | "sms" = "email") => {
    setError(null);
    const response = await grainApi.auth.resetPassword({ identifier, otp, newPassword, verificationChannel });
    return response.message;
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await grainApi.auth.me(30000);
    setUser(currentUser);
    setIsAuthenticated(true);
    return currentUser;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      isReconnecting,
      error,
      login,
      forgotPassword,
      refreshUser,
      resendOtp,
      resetPassword,
      signup,
      verifyOtp,
      logout,
    }),
    [
      error,
      forgotPassword,
      isAuthenticated,
      isLoading,
      isReconnecting,
      login,
      logout,
      refreshUser,
      resendOtp,
      resetPassword,
      signup,
      user,
      verifyOtp,
    ],
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
