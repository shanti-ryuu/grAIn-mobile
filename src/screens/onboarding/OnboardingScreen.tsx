import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Butil, ButilMood } from "@/components/mascot/Butil";
import { SpeechBubble } from "@/components/mascot/SpeechBubble";
import { useTutorial } from "@/context/TutorialContext";
import { COLORS, SPACING } from "@/utils/constants";

type Language = "en" | "fil";

interface OnboardingSlide {
  id: number;
  butilMood: ButilMood;
  title: { en: string; fil: string };
  description: { en: string; fil: string };
  butilDialogue: { en: string; fil: string };
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    butilMood: "waving",
    title: { en: "Hi! I'm Butil!", fil: "Hoy! Ako si Butil!" },
    description: {
      en: "I'm your personal grain drying assistant. Let me show you around the grAIn app.",
      fil: "Ako ang iyong katulong sa pagpapatuyo ng palay. Halika, ipakita ko sa iyo ang grAIn app.",
    },
    butilDialogue: {
      en: "Welcome to grAIn. Together, we'll make sure your rice is dried perfectly every time.",
      fil: "Maligayang pagdating sa grAIn. Sama-sama nating titiyaking maayos ang pagpapatuyo ng iyong palay.",
    },
  },
  {
    id: 2,
    butilMood: "explaining",
    title: { en: "Dashboard", fil: "Dashboard" },
    description: {
      en: "This is your main screen. See all your dryer devices, active sessions, and alerts at a glance.",
      fil: "Ito ang iyong pangunahing screen. Makikita mo dito ang lahat ng iyong dryer, active sessions, at alerts.",
    },
    butilDialogue: {
      en: "Think of the Dashboard as your dryer's report card. Everything you need to know is right here.",
      fil: "Isipin mo ang Dashboard bilang report card ng iyong dryer. Lahat ng kailangan mong malaman ay nandito.",
    },
  },
  {
    id: 3,
    butilMood: "excited",
    title: { en: "Dryer Control", fil: "Dryer Control" },
    description: {
      en: "Start, stop, and control your dryer remotely. Use AUTO mode and let the AI handle it.",
      fil: "I-start, i-stop, at kontrolin ang iyong dryer kahit saan ka man naroroon. Gamitin ang AUTO mode at hayaan ang AI.",
    },
    butilDialogue: {
      en: "Pro tip: Use AUTO mode. The AI will automatically stop the dryer when your rice reaches 14% moisture.",
      fil: "Pro tip: Gamitin ang AUTO mode. Hihinto ito kapag umabot na ang iyong palay sa 14% moisture.",
    },
  },
  {
    id: 4,
    butilMood: "explaining",
    title: { en: "Drying Sessions", fil: "Drying Sessions" },
    description: {
      en: "Track every drying cycle. See moisture levels, efficiency scores, and session history.",
      fil: "Subaybayan ang bawat drying cycle. Tingnan ang moisture levels, efficiency scores, at kasaysayan ng sessions.",
    },
    butilDialogue: {
      en: "Always start a Session before drying. It records moisture, energy used, and drying efficiency.",
      fil: "Laging magsimula ng Session bago magpatuyo. Itatala nito ang moisture, energy, at efficiency.",
    },
  },
  {
    id: 5,
    butilMood: "thinking",
    title: { en: "AI Predictions", fil: "AI Predictions" },
    description: {
      en: "The AI predicts how your grain will dry over the next hours and recommends actions.",
      fil: "Hinuhulaan ng AI kung paano matutuyo ang iyong palay sa susunod na oras at nagbibigay ng rekomendasyon.",
    },
    butilDialogue: {
      en: "The AI uses a Random Forest model trained on drying science equations. It is not guessing. It is mathematics.",
      fil: "Gumagamit ang AI ng Random Forest model na sinanay sa drying equations. Hindi ito hula. Matematika ito.",
    },
  },
  {
    id: 6,
    butilMood: "happy",
    title: { en: "You're Ready!", fil: "Handa ka na!" },
    description: {
      en: "Tap the green button anytime to ask me anything about your dryer, drying science, or the app.",
      fil: "I-tap ang berdeng button anumang oras para tanungin ako tungkol sa dryer, drying science, o app.",
    },
    butilDialogue: {
      en: "Remember, I'm always here. Tap the green chat button at the bottom right on each screen.",
      fil: "Tandaan, nandito ako palagi. I-tap ang berdeng chat button sa kanan-ibaba ng anumang screen.",
    },
  },
];

const screenWidth = Dimensions.get("window").width;

export function OnboardingScreen() {
  const { markOnboardingDone } = useTutorial();
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState<Language>("en");
  const [reactionMood, setReactionMood] = useState<ButilMood | null>(null);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const slide = slides[index];

  const finish = async () => {
    await markOnboardingDone();
    router.replace("/(app)/dashboard");
  };

  const goToIndex = (nextIndex: number) => {
    const safeIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    setIndex(safeIndex);
    listRef.current?.scrollToIndex({ index: safeIndex, animated: true });
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setIndex(nextIndex);
  };

  const replayDialogue = () => {
    setReactionMood("excited");
    setTimeout(() => setReactionMood(null), 900);
  };

  return (
    <View style={styles.container}>
      <View style={styles.languageToggle}>
        {(["en", "fil"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setLanguage(item)}
            style={[styles.languageButton, language === item && styles.languageButtonActive]}
          >
            <Text style={[styles.languageText, language === item && styles.languageTextActive]}>
              {item === "en" ? "EN" : "FIL"}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={slides}
        horizontal
        keyExtractor={(item: OnboardingSlide) => String(item.id)}
        onMomentumScrollEnd={onMomentumEnd}
        pagingEnabled
        ref={listRef}
        renderItem={({ item }: { item: OnboardingSlide }) => (
          <View style={styles.slide}>
            <View style={styles.mascotArea}>
              <Butil mood={reactionMood ?? item.butilMood} onPress={replayDialogue} size={150} speaking />
              <SpeechBubble text={item.butilDialogue[language]} visible />
            </View>
            <View style={styles.dots}>
              {slides.map((dot) => (
                <View key={dot.id} style={[styles.dot, dot.id === item.id && styles.dotActive]} />
              ))}
            </View>
            <Text style={styles.title}>{item.title[language]}</Text>
            <Text style={styles.description}>{item.description[language]}</Text>
          </View>
        )}
        showsHorizontalScrollIndicator={false}
      />

      <View style={styles.actions}>
        <Pressable onPress={() => goToIndex(slides.length - 1)} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Skip</Text>
        </Pressable>
        <Pressable
          onPress={() => (index === slides.length - 1 ? void finish() : goToIndex(index + 1))}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryText}>{index === slides.length - 1 ? "Get Started" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.lg,
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: SPACING.xl,
    textAlign: "center",
  },
  dot: {
    backgroundColor: COLORS.border,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 28,
  },
  dots: {
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  languageButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageButtonActive: {
    backgroundColor: COLORS.primary,
  },
  languageText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  languageTextActive: {
    color: "#FFFFFF",
  },
  languageToggle: {
    alignSelf: "flex-end",
    backgroundColor: "#EEF2F7",
    borderRadius: 12,
    flexDirection: "row",
    marginRight: SPACING.lg,
    marginTop: 56,
    padding: 3,
  },
  mascotArea: {
    alignItems: "center",
    height: "50%",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    minWidth: 130,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  secondaryText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "900",
  },
  slide: {
    alignItems: "center",
    width: screenWidth,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: "900",
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
});
