import React from "react";
import { Dimensions, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Mask, Rect } from "react-native-svg";

import { Butil, ButilMood } from "@/components/mascot/Butil";
import { SpeechBubble } from "@/components/mascot/SpeechBubble";
import { useTutorial } from "@/context/TutorialContext";
import { COLORS, SPACING } from "@/utils/constants";

interface TutorialStep {
  highlight: { x: number; y: number; width: number; height: number };
  butilPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  dialogue: { en: string; fil: string };
  butilMood: ButilMood;
}

function getTutorials(width: number, height: number): Record<string, TutorialStep[]> {
  return {
    dashboard: [
    {
      highlight: { x: 16, y: 185, width: width - 32, height: 210 },
      butilPosition: "bottom-left",
      dialogue: { en: "These are your dryer devices.", fil: "Ito ang iyong mga dryer devices." },
      butilMood: "explaining",
    },
    {
      highlight: { x: 16, y: 440, width: width - 32, height: 110 },
      butilPosition: "bottom-right",
      dialogue: { en: "Active sessions show drying progress here.", fil: "Dito makikita ang active drying progress." },
      butilMood: "happy",
    },
    {
      highlight: { x: width - 92, y: height - 150, width: 76, height: 76 },
      butilPosition: "top-left",
      dialogue: { en: "Tap me anytime for help.", fil: "I-tap ako anumang oras para sa tulong." },
      butilMood: "waving",
    },
    ],
    control: [
    {
      highlight: { x: 16, y: 250, width: width - 32, height: 90 },
      butilPosition: "bottom-left",
      dialogue: { en: "Choose AUTO for AI guidance or MANUAL for full control.", fil: "Piliin ang AUTO para sa AI o MANUAL para sa sariling control." },
      butilMood: "explaining",
    },
    {
      highlight: { x: 16, y: 490, width: width - 32, height: 80 },
      butilPosition: "top-right",
      dialogue: { en: "This starts or stops your dryer.", fil: "Ito ang start at stop ng dryer." },
      butilMood: "excited",
    },
    {
      highlight: { x: 16, y: 160, width: width - 32, height: 70 },
      butilPosition: "bottom-right",
      dialogue: { en: "Command status shows if the device received your command.", fil: "Makikita dito kung natanggap ng device ang command." },
      butilMood: "thinking",
    },
    ],
    sessions: [
    {
      highlight: { x: 16, y: 130, width: width - 32, height: 180 },
      butilPosition: "bottom-left",
      dialogue: { en: "Track each drying cycle here.", fil: "Subaybayan dito ang bawat drying cycle." },
      butilMood: "explaining",
    },
    ],
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function coachStyle(
  step: TutorialStep,
  width: number,
  height: number,
  topInset: number,
  bottomInset: number,
): ViewStyle {
  const horizontalMargin = 24;
  const coachWidth = Math.min(width - horizontalMargin * 2, 300);
  const coachHeight = 190;
  const nextButtonTop = height - bottomInset - 150;
  const safeTop = topInset + 56;
  const belowTarget = step.highlight.y + step.highlight.height + 18;
  const aboveTarget = step.highlight.y - coachHeight - 18;
  const top =
    belowTarget + coachHeight < nextButtonTop
      ? belowTarget
      : aboveTarget > safeTop
        ? aboveTarget
        : safeTop;
  const targetCenterX = step.highlight.x + step.highlight.width / 2;
  const preferredLeft =
    step.butilPosition.includes("right")
      ? targetCenterX - coachWidth * 0.72
      : targetCenterX - coachWidth * 0.28;

  return {
    left: clampValue(preferredLeft, horizontalMargin, width - coachWidth - horizontalMargin),
    top: clampValue(top, safeTop, nextButtonTop - coachHeight),
    width: coachWidth,
  };
}

export function InteractiveTutorial() {
  const { currentTutorialScreen, markTutorialDone } = useTutorial();
  const [stepIndex, setStepIndex] = React.useState(0);
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const tutorials = React.useMemo(() => getTutorials(width, height), [height, width]);

  if (!currentTutorialScreen || !tutorials[currentTutorialScreen]) {
    return null;
  }

  const steps = tutorials[currentTutorialScreen];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const butilStyle = coachStyle(step, width, height, insets.top, insets.bottom);

  const next = async () => {
    if (stepIndex >= steps.length - 1) {
      await markTutorialDone(currentTutorialScreen as "dashboard" | "control" | "sessions" | "device");
      setStepIndex(0);
    } else {
      setStepIndex((current) => current + 1);
    }
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
        <Defs>
          <Mask id="spotlight">
            <Rect fill="white" height={height} width={width} x={0} y={0} />
            <Rect
              fill="black"
              height={step.highlight.height}
              rx={16}
              width={step.highlight.width}
              x={step.highlight.x}
              y={step.highlight.y}
            />
          </Mask>
        </Defs>
        <Rect fill="rgba(0,0,0,0.68)" height={height} mask="url(#spotlight)" width={width} x={0} y={0} />
      </Svg>
      <View style={[styles.butilWrap, butilStyle]}>
        <SpeechBubble pointerAlign="center" text={step.dialogue.en} visible />
        <View style={styles.butilBody}>
          <Butil mood={step.butilMood} size={72} speaking />
        </View>
      </View>
      <Pressable onPress={next} style={[styles.nextButton, { bottom: Math.max(86, insets.bottom + 76) }]}>
        <Text style={styles.nextText}>{stepIndex >= steps.length - 1 ? "Got it" : "Next"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  butilWrap: {
    alignItems: "center",
    position: "absolute",
    zIndex: 2,
  },
  butilBody: {
    marginTop: -2,
  },
  nextButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    bottom: 90,
    left: SPACING.lg,
    paddingVertical: 14,
    position: "absolute",
    right: SPACING.lg,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
