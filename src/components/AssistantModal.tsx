import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import * as ReactNative from "react-native";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssistantToolCall, ChatMessage, DeviceSummary, grainApi } from "@/api/grain-api-client";
import { AnimatePressable } from "@/components/AnimatePressable";
import { useAssistant } from "@/context/AssistantContext";
import { useTheme } from "@/context/ThemeContext";
import { useWeather } from "@/hooks/useWeather";
import { COLORS, SPACING } from "@/utils/constants";
import { getListData } from "@/utils/data";

type LocalMessage = ChatMessage & {
  timestamp: string;
  actions?: AssistantToolCall[];
  toolCalls?: AssistantToolCall[];
};

const quickPrompts = [
  "What's the current dryer status?",
  "Diagnose my current readings",
  "How long until target moisture?",
  "Check recent alerts",
];
const Keyboard = (ReactNative as unknown as {
  Keyboard: {
    addListener: (event: string, callback: () => void) => { remove: () => void };
    dismiss: () => void;
  };
}).Keyboard;

function fallbackReply(message: string): string {
  const text = message.toLowerCase();
  if (/moisture|14%|target/.test(text)) {
    return "The target moisture of 14% wet basis is the safe storage point for rice grain. Below this, the grain is less likely to spoil during storage.";
  }
  if (/temperature|temp|init/.test(text)) {
    return "Optimal drying temperature is 40-55 C. Above 65 C is critical and can damage grain quality.";
  }
  return "I am currently offline. Please check your connection.";
}

function assistantErrorReply(error: unknown, originalMessage: string): string {
  if (error instanceof Error && error.message && !/network error/i.test(error.message)) {
    return cleanAssistantText(error.message);
  }

  return fallbackReply(originalMessage);
}

function cleanAssistantText(text: string): string {
  return text
    .replace(/&#96;|&grave;/g, "'")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`\n]{1,80})`/g, "$1")
    .replace(/^\s*\*\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function messageTime(date: string): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toolStatus(toolCalls?: AssistantToolCall[]): string {
  const latest = toolCalls?.at(-1)?.name;
  if (latest === "get_live_sensors") return "Checked sensors";
  if (latest === "get_ml_prediction") return "Checked prediction";
  if (latest === "get_session_history") return "Checked sessions";
  if (latest === "get_alert_history") return "Checked alerts";
  if (latest === "send_dryer_command") return "Sent command";
  return "";
}

function loadingStatus(input: string): string {
  const text = input.toLowerCase();
  if (/predict|forecast|how long|target/.test(text)) return "Getting prediction...";
  if (/alert|warning|error|critical/.test(text)) return "Checking alerts...";
  if (/start|stop|fan|heater|relay|stepper|command/.test(text)) return "Checking safety...";
  return "Checking sensors...";
}

function ActionCard({ action }: { action: AssistantToolCall }) {
  const { theme } = useTheme();
  const failed = action.status !== "success";
  return (
    <View
      style={[
        styles.actionCard,
        {
          backgroundColor: failed ? "#FEF2F2" : "#F0FDF4",
          borderColor: failed ? COLORS.danger : COLORS.success,
        },
      ]}
    >
      <Ionicons name={failed ? "warning" : "flash"} size={18} color={failed ? COLORS.danger : COLORS.success} />
      <View style={styles.actionBody}>
        <Text style={[styles.actionTitle, { color: failed ? COLORS.danger : COLORS.success }]}>
          {failed ? "Action Failed" : "Command Sent"}
        </Text>
        <Text style={[styles.actionText, { color: theme.textPrimary }]}>
          {action.commandStr ?? action.status} {action.reason ? `- ${action.reason}` : ""}
        </Text>
      </View>
    </View>
  );
}

function TypingDots({ status }: { status: string }) {
  return (
    <View style={styles.typingRow}>
      <ActivityIndicator color={COLORS.primary} />
      <View>
        <Text style={styles.typingText}>Assistant is thinking...</Text>
        <Text style={styles.toolStatusText}>{status}</Text>
      </View>
    </View>
  );
}

export function AssistantModal() {
  const { isOpen, closeAssistant } = useAssistant();
  const { isDark, theme } = useTheme();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>();
  const weatherQuery = useWeather(true);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<LocalMessage>>(null);
  const screenHeight = Dimensions.get("window").height;
  const modalHeight = keyboardVisible
    ? Math.min(screenHeight * 0.54, screenHeight - insets.top - insets.bottom - 24)
    : Math.min(screenHeight * 0.78, screenHeight - insets.top - 32);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchActiveDevice = async () => {
      try {
        const response = await grainApi.devices.list();
        const devices = getListData<DeviceSummary>(response);
        setActiveDeviceId(devices.find((device) => device.status === "online")?.deviceId ?? devices[0]?.deviceId);
      } catch {
        setActiveDeviceId(undefined);
      }
    };
    void fetchActiveDevice();
  }, [isOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  const openHistory = () => {
    closeAssistant();
    router.push({ pathname: "/agent-logs", params: activeDeviceId ? { deviceId: activeDeviceId } : {} } as never);
  };

  const sendQuickPrompt = (prompt: string) => {
    Keyboard.dismiss();
    void sendMessage(prompt);
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim().slice(0, 500);
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: LocalMessage = { role: "user", content: trimmed, timestamp: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLastInput(trimmed);
    setIsLoading(true);

    try {
      const contextMessages = nextMessages.slice(-12).map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      }));
      const weatherData = weatherQuery.weather
        ? {
            temperature: weatherQuery.weather.current.temperature,
            humidity: weatherQuery.weather.current.humidity,
            description: weatherQuery.weather.current.description,
            suitable: weatherQuery.weather.dryingAdvice.suitable,
            recommendation: weatherQuery.weather.dryingAdvice.recommendation,
            cityName: weatherQuery.weather.current.cityName,
          }
        : undefined;
      const response = await grainApi.ai.chat(contextMessages, activeDeviceId, autonomousMode, weatherData);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.reply,
          timestamp: new Date().toISOString(),
          actions: response.actions,
          toolCalls: response.toolCalls,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: assistantErrorReply(error, trimmed), timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={isOpen} onRequestClose={closeAssistant}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.backdrop}
      >
        <View style={[styles.sheet, { backgroundColor: theme.bgBase, height: modalHeight, marginTop: insets.top + 16 }]}>
          <View style={[styles.header, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>grAIn Assistant</Text>
              <Text style={[styles.subtitle, { color: theme.textPrimary }]}>
                {activeDeviceId ? `Device: ${activeDeviceId}` : "System assistant"}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable accessibilityLabel="AI action history" onPress={openHistory} style={styles.iconButton}>
                <Ionicons name="time" size={22} color={theme.textPrimary} />
              </Pressable>
              <Pressable accessibilityLabel="Close assistant" onPress={closeAssistant} style={styles.iconButton}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.autoRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <View style={styles.autoLabelWrap}>
              <Ionicons name="hardware-chip" size={18} color={theme.accentPrimary} />
              <Text style={[styles.autoLabel, { color: theme.textPrimary }]}>Auto Control</Text>
            </View>
            <Switch
              onValueChange={setAutonomousMode}
              thumbColor={autonomousMode ? COLORS.primary : "#F4F4F5"}
              trackColor={{ false: theme.border, true: theme.accentPrimarySubtle }}
              value={autonomousMode}
            />
          </View>

          {autonomousMode ? (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={16} color="#92400E" />
              <Text style={styles.warningText}>AI may send commands automatically when safety rules require it.</Text>
            </View>
          ) : null}

          {messages.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.quickWrapContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.quickWrap}
            >
              {quickPrompts.map((prompt) => (
                <AnimatePressable
                  key={prompt}
                  onPress={() => sendQuickPrompt(prompt)}
                  style={[
                    styles.quickPrompt,
                    {
                      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                      borderColor: isDark ? "#2C2C2E" : "rgba(255,255,255,0.90)",
                    },
                  ]}
                >
                  <Text style={[styles.quickText, { color: theme.textPrimary }]}>{prompt}</Text>
                  <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
                </AnimatePressable>
              ))}
            </ScrollView>
          ) : (
            <FlatList
              contentContainerStyle={styles.messageList}
              data={messages}
              keyExtractor={(item: LocalMessage, index: number) => `${item.timestamp}-${index}`}
              keyboardShouldPersistTaps="handled"
              ref={listRef}
              style={styles.messageListWrap}
              renderItem={({ item }: { item: LocalMessage }) => (
                <View style={[styles.bubbleWrap, item.role === "user" ? styles.userBubbleWrap : styles.assistantBubbleWrap]}>
                  <View
                    style={[
                      styles.bubble,
                      item.role === "user"
                        ? styles.userBubble
                        : { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[styles.messageText, { color: item.role === "user" ? "#FFFFFF" : theme.textPrimary }]}>
                      {item.role === "assistant" ? cleanAssistantText(item.content) : item.content}
                    </Text>
                  </View>
                  {item.actions?.map((action, index) => (
                    <ActionCard action={action} key={`${action.commandStr ?? action.status}-${index}`} />
                  ))}
                  {toolStatus(item.toolCalls) ? <Text style={styles.toolStatusText}>{toolStatus(item.toolCalls)}</Text> : null}
                  <Text style={[styles.timestamp, { color: theme.textSecondary }]}>{messageTime(item.timestamp)}</Text>
                </View>
              )}
            />
          )}

          {isLoading ? <TypingDots status={loadingStatus(lastInput)} /> : null}

          <View style={[styles.inputRow, { backgroundColor: theme.bgBase, paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
            <TextInput
              maxLength={500}
              multiline
              onChangeText={setInput}
              placeholder="Ask about dryer status, predictions, or controls..."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#111912" : theme.bgCard,
                  borderColor: isDark ? "#314234" : theme.border,
                  color: theme.textPrimary,
                },
              ]}
              value={input}
            />
            <Pressable disabled={isLoading || !input.trim()} onPress={() => void sendMessage(input)} style={[styles.sendButton, (isLoading || !input.trim()) && styles.disabledButton]}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionBody: {
    flex: 1,
  },
  actionCard: {
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    maxWidth: "88%",
    padding: SPACING.sm,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 2,
  },
  assistantBubbleWrap: {
    alignItems: "flex-start",
  },
  autoLabel: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  autoLabelWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.xs,
    minHeight: 32,
  },
  autoRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  bubble: {
    borderRadius: 18,
    maxWidth: "84%",
    padding: SPACING.md,
  },
  bubbleWrap: {
    gap: 3,
    marginBottom: SPACING.md,
  },
  disabledButton: {
    opacity: 0.55,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: SPACING.md,
    paddingTop: 18,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.xs,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  input: {
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    maxHeight: 110,
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 14,
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  messageList: {
    flexGrow: 1,
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  messageListWrap: {
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  quickPrompt: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  quickText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  quickWrap: {
    flex: 1,
  },
  quickWrapContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingTop: 22,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    marginLeft: 10,
    width: 56,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 60,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
  },
  toolStatusText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  typingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  typingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  userBubble: {
    backgroundColor: COLORS.primary,
  },
  userBubbleWrap: {
    alignItems: "flex-end",
  },
  warningBanner: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  warningText: {
    color: "#92400E",
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
});
