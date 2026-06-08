import axios, { AxiosError, AxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

import { API_TIMEOUT } from "@/utils/constants";

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

export interface PredictiveControlState {
  enabled: boolean;
  status: "idle" | "cooldown" | "action_sent" | "maintaining";
  lastAction?: "STOP" | "EMERGENCY_STOP" | "REDUCE_TEMP" | "INCREASE_FAN" | "MAINTAIN";
  lastActionAt?: string;
  nextAllowedAt?: string;
  reason?: string;
  commandId?: string;
}

export interface DeviceRuntimeState {
  isRunning?: boolean;
  currentMode?: "AUTO" | "MANUAL";
  heaterState?: "ON" | "OFF";
  fan1State?: "ON" | "OFF";
  fan2State?: "ON" | "OFF";
  relayState?: "ON" | "OFF";
  stepperState?: "ON" | "OFF" | "CW" | "CCW";
  lastSeen?: string;
  activeCommand?: string;
  pendingCommand?: string;
  commandAcknowledged?: boolean;
  currentTemperature?: number;
  currentHumidity?: number;
  currentMoisture?: number;
  currentWeight?: number;
  predictiveControl?: PredictiveControlState;
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
  runtimeState?: DeviceRuntimeState;
}

export interface ClaimedDeviceSummary {
  id: string;
  deviceId: string;
  name: string;
  location: string;
}

export interface ClaimDeviceResponse {
  message: string;
  alreadyClaimed?: boolean;
  device?: ClaimedDeviceSummary;
}

export interface ClaimTokenResponse {
  claimUrl: string;
  deviceId: string;
  deviceName?: string;
  expiresAt: string;
  expiresInHours?: number;
}

export interface SessionSummary {
  _id: string;
  deviceId: string;
  status: "active" | "completed" | "aborted";
  grainType: string;
  mode?: "AUTO" | "MANUAL";
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
  confidenceInterval?: {
    lowerMoisture: number;
    upperMoisture: number;
    margin: number;
    confidenceLevel: number;
  };
  isDryingComplete: boolean;
  projectedCurve?: { minutesFromNow: number; predictedMoisture: number }[];
  targetMoisture: number;
  algorithm: string;
  weatherEnhanced?: boolean;
  weatherContext?: WeatherContext | null;
  dryingConditionNote?: string;
  modelSelection?: {
    selectedModel: string;
    reason: string;
    candidates: { model: string; score: number | null }[];
  };
  modelMetrics?: {
    moistureR2?: number;
    moistureR2_rf?: number | null;
    moistureR2_xgb?: number | null;
    moistureR2_ensemble?: number | null;
    rfWeight?: number | null;
    xgbWeight?: number | null;
  };
}

export interface WeatherContext {
  outdoorHumidity: number;
  outdoorTemperature: number;
  cloudCover: number;
  windSpeed: number;
}

export interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    cloudCover: number;
    visibility: number;
    uvIndex: number;
    description: string;
    icon: string;
    iconUrl: string;
    cityName: string;
    country: string;
    sunrise: string;
    sunset: string;
    timestamp: string;
  };
  forecast: {
    datetime: string;
    temperature: number;
    humidity: number;
    description: string;
    icon: string;
    iconUrl: string;
    rainProbability: number;
    windSpeed: number;
  }[];
  dryingAdvice: {
    recommendation: string;
    suitable: boolean;
    reason: string;
    optimalWindow: string | null;
  };
  location: {
    lat: number;
    lon: number;
    cityName: string;
    country: string;
  };
}

export interface AssistantWeatherData {
  temperature: number;
  humidity: number;
  description: string;
  suitable: boolean;
  recommendation: string;
  cityName: string;
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
    | "session_aborted"
    | "predictive_control"
    | "ai_action"
    | "weather_alert"
    | "session_milestone";
  title: string;
  body: string;
  data?: Record<string, string>;
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
  moistureTrend: {
    timestamp?: string;
    date: string;
    avgMoisture?: number;
    avgStartMoisture: number;
    avgFinalMoisture: number;
    avgReduction: number;
    sessionCount: number;
  }[];
  energyTrend: { timestamp?: string; date: string; totalEnergy: number; avgEnergy: number; sessionCount: number }[];
  solarEfficiencyTrend?: {
    timestamp?: string;
    date: string;
    avgVoltage: number;
    avgCurrent: number;
    avgPowerWatts: number;
    efficiencyScore: number;
    sampleCount: number;
  }[];
  grainTypeComparison?: GrainTypeAnalytics[];
  totals?: {
    sessions: number;
    completedSessions: number;
    activeSessions: number;
    devices: number;
    alerts: number;
  };
  kpis?: {
    avgEfficiency: number;
    avgDryingTime: number;
    avgEnergyPerSession: number;
    avgMoistureReduction: number;
    totalGrainDried: number;
    successRate: number;
  };
  efficiencyTrend?: { date: string; avgEfficiency: number; sessionCount: number }[];
  dryingTimeTrend?: { date: string; avgDurationMinutes: number; sessionCount: number }[];
  sessionBreakdown?: {
    completed: number;
    aborted: number;
    active: number;
  };
  bestSession?: AnalyticsSessionRank | null;
  worstSession?: AnalyticsSessionRank | null;
  alertBreakdown?: {
    critical: number;
    warning: number;
    info: number;
  };
  period?: "daily" | "weekly" | "monthly";
  deviceId?: string | null;
  generatedAt?: string;
}

export interface GrainTypeAnalytics {
  grainType: string;
  sessionCount: number;
  avgEfficiency: number;
  avgDryingTime: number;
  avgEnergyUsed: number;
  avgMoistureReduction: number;
  successRate: number;
}

export interface AnalyticsModeStats {
  sessionCount: number;
  avgEfficiency: number;
  avgDryingTime: number;
  avgEnergyUsed: number;
  overdryingIncidents: number;
  underdryingIncidents: number;
  successRate: number;
}

export interface AnalyticsCompare {
  comparison: {
    auto: AnalyticsModeStats;
    manual: AnalyticsModeStats;
    improvement: {
      efficiencyGain: number;
      timeSaved: number;
      energySaved: number;
      overdryingReduction: number;
    };
  };
  period: "all" | "weekly" | "monthly";
  deviceId?: string | null;
  generatedAt?: string;
}

export interface AnalyticsSessionRank {
  id: string;
  _id?: string;
  efficiency: number;
  duration: number;
  startMoisture: number;
  finalMoisture: number;
  startedAt: string;
}

export interface SessionReportData {
  session: {
    id: string;
    deviceId: string;
    deviceName: string;
    grainType: string;
    status: string;
    startMoisture: number;
    targetMoisture: number;
    finalMoisture: number;
    startWeight: number;
    finalWeight: number;
    totalEnergyUsed: number;
    avgTemperature: number;
    avgHumidity: number;
    avgFanSpeed: number;
    efficiency: number;
    duration: number;
    startedAt: string;
    completedAt: string;
    dataPoints: number;
  };
  sensorReadings: {
    timestamp: string;
    minutesElapsed: number;
    temperature: number;
    humidity: number;
    moisture: number;
    fanSpeed: number;
    energy: number;
    solarVoltage: number;
  }[];
  predictions: {
    predictedMoisture30min: number;
    recommendationType: string;
    recommendation: string;
    efficiencyScore: number;
    confidence: number;
    createdAt: string;
  }[];
  alerts: {
    type: string;
    message: string;
    severity: number;
    createdAt: string;
  }[];
  grainQuality: {
    grade: "A" | "B" | "C" | "F";
    millingRecoveryEstimate: number;
    aflatoxinRisk: "low" | "medium" | "high";
    storageRecommendation: string;
    qualityScore: number;
  };
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
    forgotPassword: (payload: { identifier: string; verificationChannel?: "email" | "sms" }) =>
      apiClient.post<MessageResponse, MessageResponse>("/auth/forgot-password", payload),
    resetPassword: (payload: { identifier: string; otp: string; newPassword: string; verificationChannel?: "email" | "sms" }) =>
      apiClient.post<MessageResponse, MessageResponse>("/auth/reset-password", payload),
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
    claimDevice: (deviceId: string, token: string) =>
      apiClient.post<ClaimDeviceResponse, ClaimDeviceResponse>(`/devices/${deviceId}/claim`, { token }),
    generateClaimToken: (deviceId: string) =>
      apiClient.post<ClaimTokenResponse, ClaimTokenResponse>(`/devices/${deviceId}/claim-token`),
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
    getReport: (id: string) => apiClient.get<SessionReportData, SessionReportData>(`/sessions/${id}/report`),
    start: (payload: { deviceId: string; grainType?: string; mode?: "AUTO" | "MANUAL"; targetMoisture?: number }) =>
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
    compare: (period: "all" | "weekly" | "monthly", deviceId?: string) =>
      apiClient.get<AnalyticsCompare, AnalyticsCompare>("/analytics/compare", { params: { period, deviceId } }),
  },
  weather: {
    get: (lat: number, lon: number) =>
      apiClient.get<WeatherData, WeatherData>("/weather", { params: { lat, lon } }),
  },
  ai: {
    predict: (payload: Record<string, unknown>) => apiClient.post<PredictionResponse, PredictionResponse>("/ai/predict", payload),
    chat: (messages: ChatMessage[], deviceId?: string, autonomousMode = false, weatherData?: AssistantWeatherData) =>
      apiClient.post<ChatResponse, ChatResponse>("/assistant/chat", { messages, deviceId, autonomousMode, weatherData }),
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
