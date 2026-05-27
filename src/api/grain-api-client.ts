import axios, { AxiosError, AxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

import { API_TIMEOUT } from "@/utils/constants";
import { emitLogout } from "@/utils/authEvents";

export const GRAIN_TOKEN_KEY = "grain_token";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  timestamp?: string;
};

export interface AuthUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: "admin" | "farmer";
  profileImage?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
  };
}

export interface DeviceSummary {
  _id: string;
  id?: string;
  deviceId: string;
  name: string;
  location: string;
  status: "online" | "offline";
  lastActive: string;
  lastMoisture: number;
  runtimeState?: Record<string, unknown>;
}

export interface SessionSummary {
  _id: string;
  deviceId: string;
  status: "active" | "completed" | "aborted";
  grainType: string;
  startMoisture: number;
  currentMoisture: number;
  targetMoisture: number;
  finalMoisture?: number;
  totalEnergyUsed?: number;
  efficiency?: number;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface SensorReading {
  _id?: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  moisture: number;
  fanSpeed?: number;
  energy?: number;
  status?: string;
  solarVoltage?: number;
  solarCurrent?: number;
  weight?: number;
  timestamp: string;
}

export interface AlertSummary {
  _id: string;
  deviceId: string;
  type: "critical" | "warning" | "info";
  message: string;
  severity?: number;
  isRead: boolean;
  createdAt: string;
}

export interface CommandSummary {
  _id: string;
  deviceId: string;
  command: string;
  commandStr: string;
  status: string;
  createdAt: string;
}

export interface PredictionResponse {
  predictedMoisture30min: number;
  estimatedMinutesToTarget: number;
  recommendation: string;
  recommendationType: "optimal" | "warning" | "critical";
  efficiencyScore: number;
  confidence: number;
  isDryingComplete: boolean;
  projectedCurve?: { minutesFromNow: number; predictedMoisture: number }[];
  targetMoisture: number;
  algorithm: string;
  modelMetrics?: { moistureR2?: number };
}

export interface NotificationSummary {
  _id: string;
  userId: string;
  deviceId?: string;
  type:
    | "drying_complete"
    | "alert_critical"
    | "alert_warning"
    | "device_offline"
    | "session_started"
    | "session_aborted";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  avgEfficiency: number;
  avgDuration: number;
  totalEnergyUsed: number;
  totalDevices: number;
  onlineDevices: number;
  totalAlerts: number;
  criticalAlerts: number;
  recentSessions: SessionSummary[];
  moistureTrend: { timestamp: string; avgMoisture: number }[];
  energyTrend: { timestamp: string; totalEnergy: number }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
}

export type RequestParams = Record<string, string | number | boolean | undefined>;

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: API_TIMEOUT.DEFAULT,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(GRAIN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const envelope = response.data as ApiEnvelope<unknown>;
    if (envelope && typeof envelope === "object" && "success" in envelope) {
      return envelope.data ?? envelope;
    }
    return response.data;
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(GRAIN_TOKEN_KEY);
      emitLogout();
    }

    const message =
      error.response?.data?.error ??
      error.message ??
      "Unable to complete request. Please try again.";
    return Promise.reject(new Error(message));
  },
);

function withTimeout(timeout?: number): AxiosRequestConfig | undefined {
  return timeout ? { timeout } : undefined;
}

export const grainApi = {
  auth: {
    login: (email: string, password: string) =>
      apiClient.post<AuthResponse, AuthResponse>("/auth/login", { email, password }),
    register: (name: string, email: string, password: string, role: "admin" | "farmer" = "farmer") =>
      apiClient.post<AuthResponse, AuthResponse>("/auth/register", { name, email, password, role }),
    me: (timeout?: number) => apiClient.post<AuthUser, AuthUser>("/auth/me", undefined, withTimeout(timeout)),
    logout: () => apiClient.post<{ message: string }, { message: string }>("/auth/logout"),
  },
  devices: {
    list: () => apiClient.get<PaginatedResponse<DeviceSummary>, PaginatedResponse<DeviceSummary>>("/devices"),
    getById: (id: string) => apiClient.get<DeviceSummary, DeviceSummary>(`/devices/${id}`),
    register: (deviceId: string, location?: string) =>
      apiClient.post<DeviceSummary, DeviceSummary>("/devices", { deviceId, location }),
  },
  sensors: {
    getData: (deviceId: string, params?: RequestParams) =>
      apiClient.get<SensorReading[] | PaginatedResponse<SensorReading>, SensorReading[] | PaginatedResponse<SensorReading>>(`/sensors/${deviceId}`, { params }),
    getLatest: (deviceId: string) =>
      apiClient.get<SensorReading[] | PaginatedResponse<SensorReading>, SensorReading[] | PaginatedResponse<SensorReading>>(`/sensors/${deviceId}`, { params: { hours: 1, limit: 1 } }),
  },
  dryer: {
    start: (deviceId: string, mode: "AUTO" | "MANUAL", temperature?: number, fanSpeed?: number) =>
      apiClient.post(`/dryer/${deviceId}/start`, { mode, temperature, fanSpeed }),
    stop: (deviceId: string) => apiClient.post(`/dryer/${deviceId}/stop`),
    controlFan: (deviceId: string, fanTarget: "FAN1" | "FAN2" | "ALL", fanAction: "ON" | "OFF") =>
      apiClient.post(`/dryer/${deviceId}/fan`, { fanTarget, fanAction }),
    controlRelay: (deviceId: string, relayAction: "ON" | "OFF") =>
      apiClient.post(`/dryer/${deviceId}/relay`, { relayAction }),
    controlStepper: (deviceId: string, stepperAction: "START" | "STOP" | "CW" | "CCW") =>
      apiClient.post(`/dryer/${deviceId}/stepper`, { stepperAction }),
    controlHeater: (deviceId: string, heaterAction: "ON" | "OFF") =>
      apiClient.post(`/dryer/${deviceId}/heater`, { heaterAction }),
    getCommands: (deviceId: string) => apiClient.get(`/commands/${deviceId}`),
  },
  sessions: {
    list: (params?: RequestParams) => apiClient.get<SessionSummary[] | PaginatedResponse<SessionSummary>, SessionSummary[] | PaginatedResponse<SessionSummary>>("/sessions", { params }),
    getById: (id: string) => apiClient.get<SessionSummary, SessionSummary>(`/sessions/${id}`),
    start: (payload: { deviceId: string; grainType?: string; targetMoisture?: number }) =>
      apiClient.post("/sessions", payload),
    end: (id: string, action: "complete" | "abort") => apiClient.patch(`/sessions/${id}`, { action }),
    getActive: (deviceId?: string) =>
      apiClient.get<SessionSummary[] | PaginatedResponse<SessionSummary>, SessionSummary[] | PaginatedResponse<SessionSummary>>("/sessions", { params: { status: "active", deviceId } }),
  },
  notifications: {
    list: (params?: RequestParams) =>
      apiClient.get<NotificationSummary[] | PaginatedResponse<NotificationSummary>, NotificationSummary[] | PaginatedResponse<NotificationSummary>>("/notifications", { params }),
    markRead: (ids?: string[]) =>
      apiClient.patch("/notifications", ids ? { ids } : { all: true }),
    registerFCMToken: (token: string, platform: "web" | "android" | "ios" = "android") =>
      apiClient.post("/notifications/fcm-token", { token, platform }),
    removeFCMToken: (token: string) => apiClient.delete("/notifications/fcm-token", { data: { token } }),
  },
  alerts: {
    getAll: (params?: RequestParams) => apiClient.get<AlertSummary[] | PaginatedResponse<AlertSummary>, AlertSummary[] | PaginatedResponse<AlertSummary>>("/alerts", { params }),
    markRead: (id: string) => apiClient.patch(`/alerts/${id}/read`),
    clear: () => apiClient.post("/alerts/clear"),
  },
  commands: {
    history: (deviceId: string) =>
      apiClient.get<CommandSummary[] | PaginatedResponse<CommandSummary>, CommandSummary[] | PaginatedResponse<CommandSummary>>("/commands/history", {
        params: { deviceId, limit: 5 },
      }),
  },
  analytics: {
    getOverview: (period: "daily" | "weekly" | "monthly", deviceId?: string) =>
      apiClient.get<AnalyticsOverview, AnalyticsOverview>("/analytics/overview", { params: { period, deviceId } }),
  },
  ai: {
    predict: (payload: Record<string, unknown>) => apiClient.post<PredictionResponse, PredictionResponse>("/ai/predict", payload),
    chat: (messages: ChatMessage[], language: "EN" | "FIL", deviceId?: string) =>
      apiClient.post<ChatResponse, ChatResponse>("/assistant/chat", { messages, language, deviceId }),
  },
  profile: {
    get: () => apiClient.get<AuthUser, AuthUser>("/users/profile"),
    update: (data: Partial<Pick<AuthUser, "name" | "profileImage">> & {
      bio?: string;
      phoneNumber?: string;
      location?: string;
    }) => apiClient.patch("/users/profile", data),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post("/users/change-password", data),
  },
  health: {
    check: (timeout?: number) => apiClient.get("/health", withTimeout(timeout)),
    ping: () => apiClient.get("/ping"),
  },
};

export default apiClient;
