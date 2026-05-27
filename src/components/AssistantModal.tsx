import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChatMessage, DeviceSummary, grainApi } from "@/api/grain-api-client";
import { useAssistant } from "@/context/AssistantContext";
import { COLORS, SPACING } from "@/utils/constants";
import { getListData } from "@/utils/data";

type Language = "EN" | "FIL";
type LocalMessage = ChatMessage & { timestamp: string };

const CHAT_LANG_KEY = "@grain_chat_lang";
const APP_LANG_KEY = "@grain_app_lang";

const quickPrompts: Record<Language, string[]> = {
  EN: [
    "What's the current dryer status?",
    "How does AUTO mode work?",
    "Why is 14% the target moisture?",
    "Diagnose my current readings",
  ],
  FIL: [
    "Ano ang current status ng dryer?",
    "Paano gumagana ang AUTO mode?",
    "Bakit 14% ang target moisture?",
    "I-diagnose ang current readings ko",
  ],
};

function fallbackReply(message: string): string {
  const text = message.toLowerCase();
  if (/moisture|14%|target/.test(text)) {
    return "The target moisture of 14% wet basis is the safe storage point for rice grain. Below this, the grain is less likely to spoil during storage.";
  }
  if (/auto mode|automatic/.test(text)) {
    return "AUTO mode uses the AI prediction engine to estimate moisture drop and recommend dryer settings while watching for completion.";
  }
  if (/temperature|temp|init/.test(text)) {
    return "Optimal drying temperature is 40-55 C. Above 65 C is critical and can damage grain quality.";
  }
  if (/fan|airflow/.test(text)) {
    return "Fan control manages airflow through the grain bed. Stronger airflow helps remove humid air and improve drying consistency.";
  }
  if (/solar|voltage|energy/.test(text)) {
    return "Solar voltage monitoring helps track available power and estimate dryer energy usage during each session.";
  }
  return "I am currently offline. Please check your connection.";
}

function messageTime(date: string): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AssistantModal() {
  const { isOpen, closeAssistant } = useAssistant();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [language, setLanguage] = useState<Language>("EN");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>();
  const listRef = useRef<FlatList<LocalMessage>>(null);

  useEffect(() => {
    const loadLanguage = async () => {
      const chatLang = await AsyncStorage.getItem(CHAT_LANG_KEY);
      const appLang = await AsyncStorage.getItem(APP_LANG_KEY);
      const nextLang = chatLang ?? appLang;
      if (nextLang === "EN" || nextLang === "FIL") {
        setLanguage(nextLang);
      }
    };
    void loadLanguage();
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

  const changeLanguage = async (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    await AsyncStorage.setItem(CHAT_LANG_KEY, nextLanguage);
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
    setIsLoading(true);

    try {
      const contextMessages = nextMessages.slice(-12).map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      }));
      const response = await grainApi.ai.chat(contextMessages, language, activeDeviceId);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.reply, timestamp: new Date().toISOString() },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: fallbackReply(trimmed), timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal animationType="slide" visible={isOpen} onRequestClose={closeAssistant}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>grAIn Assistant</Text>
            <Text style={styles.subtitle}>{activeDeviceId ? `Device: ${activeDeviceId}` : "System assistant"}</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.languageToggle}>
              {(["EN", "FIL"] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => void changeLanguage(item)}
                  style={[styles.langButton, language === item && styles.langButtonActive]}
                >
                  <Text style={[styles.langText, language === item && styles.langTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={closeAssistant} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </Pressable>
          </View>
        </View>

        {messages.length === 0 ? (
          <View style={styles.quickWrap}>
            {quickPrompts[language].map((prompt) => (
              <Pressable key={prompt} onPress={() => void sendMessage(prompt)} style={styles.quickPrompt}>
                <Text style={styles.quickText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <FlatList
          contentContainerStyle={styles.messageList}
          data={messages}
          keyExtractor={(item: LocalMessage, index: number) => `${item.timestamp}-${index}`}
          ref={listRef}
          renderItem={({ item }: { item: LocalMessage }) => (
            <View style={[styles.bubbleWrap, item.role === "user" ? styles.userBubbleWrap : styles.assistantBubbleWrap]}>
              <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageText, item.role === "user" ? styles.userText : styles.assistantText]}>
                  {item.content}
                </Text>
              </View>
              <Text style={styles.timestamp}>{messageTime(item.timestamp)}</Text>
            </View>
          )}
        />

        {isLoading ? (
          <View style={styles.typingRow}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.typingText}>Assistant is typing...</Text>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            maxLength={500}
            multiline
            onChangeText={setInput}
            placeholder="Ask about dryer status, moisture, or controls..."
            style={styles.input}
            value={input}
          />
          <Pressable disabled={isLoading || !input.trim()} onPress={() => void sendMessage(input)} style={styles.sendButton}>
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  assistantBubble: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  assistantBubbleWrap: {
    alignItems: "flex-start",
  },
  assistantText: {
    color: COLORS.textPrimary,
  },
  bubble: {
    borderRadius: 18,
    maxWidth: "82%",
    padding: SPACING.md,
  },
  bubbleWrap: {
    gap: 3,
    marginBottom: SPACING.md,
  },
  closeButton: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.md,
    paddingTop: 54,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    color: COLORS.textPrimary,
    flex: 1,
    maxHeight: 110,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  inputRow: {
    alignItems: "flex-end",
    backgroundColor: COLORS.background,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  langButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  langButtonActive: {
    backgroundColor: COLORS.primary,
  },
  languageToggle: {
    backgroundColor: "#EEF2F7",
    borderRadius: 12,
    flexDirection: "row",
    padding: 3,
  },
  langText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  langTextActive: {
    color: "#FFFFFF",
  },
  messageList: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  quickPrompt: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: SPACING.md,
  },
  quickText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  quickWrap: {
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  timestamp: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontWeight: "900",
  },
  typingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  typingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  userBubble: {
    backgroundColor: COLORS.primary,
  },
  userBubbleWrap: {
    alignItems: "flex-end",
  },
  userText: {
    color: "#FFFFFF",
  },
});
