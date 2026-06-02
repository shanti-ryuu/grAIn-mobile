import axios, { AxiosError, AxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

import { API_TIMEOUT } from "@/utils/constants";
import { emitLogout } from "@/utils/authEvents";

export const GRAIN_TOKEN_KEY = "grain_token";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  timestamp?: string;
};

export class GrainApiError extends Error {
  errorCode?: string;
  data?: unknown;
  status?: number;

  constructor(message: string, options: { errorCode?: string; data?: unknown; status?: number } = {}) {
    super(message);
    this.name = "GrainApiError";
    this.errorCode = options.errorCode;
    this.data = options.data;
    this.status = options.status;
  }
}

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

type MeResponse = AuthUser | { user: AuthUser };
type ProfileResponse = AuthUser | { user: AuthUser };

export interface VerificationStartResponse {
  message: string;
  email: string;
  phoneNumber?: string;
  verificationChannel: "email" | "sms";
}

export interface MessageResponse {
  message: string;
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
  modelMetrics?: {
    moistureR2?: number;
    moistureR2_rf?: number | null;
    moistureR2_xgb?: number | null;
    moistureR2_ensemble?: number | null;
    rfWeight?: number | null;
    xgbWeight?: number | null;
  };
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

export interface AssistantToolCall {
  name: string;
  status: "success" | "failed" | "device_offline";
  commandStr?: string;
  reason?: string;
}

export interface ChatResponse {
  reply: string;
  modelUsed?: string;
  toolCalls?: AssistantToolCall[];
  actions?: AssistantToolCall[];
}

export interface AgentActionLogSummary {
  _id: string;
  deviceId: string;
  action: string;
  commandType?: string;
  commandStr?: string;
  reason: string;
  autonomousMode: boolean;
  result?: "success" | "failed" | "device_offline";
  createdAt: string;
}

export type RequestParams = Record<string, string | number | boolean | undefined>;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT.DEFAULT,
});

apiClient.interceptors.request.use(async (config) => {
  if (!API_BASE_URL) {
    throw new GrainApiError("Mobile API URL is missing. Rebuild the app with EXPO_PUBLIC_API_URL set in the EAS preview environment.");
  }

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
    const requestUrl = error.config?.url ?? "";
    const isAuthFormRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/verify-otp") ||
      requestUrl.includes("/auth/resend-otp");

    if (error.response?.status === 401 && !isAuthFormRequest) {
      await SecureStore.deleteItemAsync(GRAIN_TOKEN_KEY);
      emitLogout();
    }

    const envelope = error.response?.data;
    const message = envelope?.error ?? error.message ?? "Unable to complete request. Please try again.";
    return Promise.reject(
      new GrainApiError(message, {
        errorCode: envelope?.errorCode,
        data: envelope?.data,
        status: error.response?.status,
      }),
    );
  },
);

function withTimeout(timeout?: number): AxiosRequestConfig | undefined {
  return timeout ? { timeout } : undefined;
}

export const grainApi = {
  auth: {
    login: (identifier: string, password: string) =>
      apiClient.post<AuthResponse, AuthResponse>("/auth/login", { identifier, password }),
    register: (
      name: string,
      email: string,
      password: string,
      phoneNumber?: string,
      verificationChannel: "email" | "sms" = "email",
    ) =>
      apiClient.post<VerificationStartResponse, VerificationStartResponse>("/auth/register", {
        name,
        email,
        password,
        phoneNumber,
        verificationChannel,
      }),
    verifyOtp: (payload: { email?: string; phoneNumber?: string; otp: string; verificationChannel?: "email" | "sms" }) =>
      apiClient.post<AuthResponse, AuthResponse>("/auth/verify-otp", payload),
    resendOtp: (payload: { email?: string; phoneNumber?: string; verificationChannel?: "email" | "sms" }) =>
      apiClient.post<MessageResponse, MessageResponse>("/auth/resend-otp", payload),
    me: async (timeout?: number) => {
      const response = await apiClient.post<MeResponse, MeResponse>("/auth/me", undefined, withTimeout(timeout));
      return "user" in response ? response.user : response;
    },
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
    chat: (messages: ChatMessage[], deviceId?: string, autonomousMode = false) =>
      apiClient.post<ChatResponse, ChatResponse>("/assistant/chat", { messages, deviceId, autonomousMode }),
    actionLogs: (deviceId: string, params?: { page?: number; limit?: number }) =>
      apiClient.get<PaginatedResponse<AgentActionLogSummary>, PaginatedResponse<AgentActionLogSummary>>("/assistant/logs", {
        params: { deviceId, ...params },
      }),
  },
  profile: {
    get: async () => {
      const response = await apiClient.get<ProfileResponse, ProfileResponse>("/users/profile");
      return "user" in response ? response.user : response;
    },
    update: (data: Partial<Pick<AuthUser, "name" | "profileImage">> & {
      bio?: string;
      phoneNumber?: string;
      location?: string;
    }) =>
      apiClient
        .patch<ProfileResponse, ProfileResponse>("/users/profile", data)
        .then((response) => ("user" in response ? response.user : response)),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post("/users/change-password", data),
  },
  health: {
    check: (timeout?: number) => apiClient.get("/health", withTimeout(timeout)),
    ping: () => apiClient.get("/ping"),
  },
};

export default apiClient;
