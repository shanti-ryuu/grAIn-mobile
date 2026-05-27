import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const ONBOARDING_DONE_KEY = "@grain_onboarding_done";

type TutorialScreen = "dashboard" | "control" | "sessions" | "device";

interface TutorialContextValue {
  onboardingDone: boolean;
  tutorialsDone: Record<string, boolean>;
  currentTutorialScreen: string | null;
  isLoadingTutorialState: boolean;
  markOnboardingDone: () => Promise<void>;
  markTutorialDone: (screen: TutorialScreen) => Promise<void>;
  resetFeatureTutorials: () => Promise<void>;
  startTutorial: (screen: TutorialScreen) => void;
  skipAllTutorials: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

const tutorialKeys: Record<TutorialScreen, string> = {
  dashboard: "@grain_tutorial_dashboard",
  control: "@grain_tutorial_control",
  sessions: "@grain_tutorial_sessions",
  device: "@grain_tutorial_device",
};

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [tutorialsDone, setTutorialsDone] = useState<Record<string, boolean>>({});
  const [currentTutorialScreen, setCurrentTutorialScreen] = useState<string | null>(null);
  const [isLoadingTutorialState, setIsLoadingTutorialState] = useState(true);

  useEffect(() => {
    const loadState = async () => {
      const entries = await AsyncStorage.multiGet([ONBOARDING_DONE_KEY, ...Object.values(tutorialKeys)]);
      const state = Object.fromEntries(entries);
      setOnboardingDone(state[ONBOARDING_DONE_KEY] === "true");
      setTutorialsDone(
        Object.fromEntries(
          Object.entries(tutorialKeys).map(([screen, key]) => [screen, state[key] === "done"]),
        ),
      );
      setIsLoadingTutorialState(false);
    };

    void loadState();
  }, []);

  const markOnboardingDone = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    setOnboardingDone(true);
  }, []);

  const markTutorialDone = useCallback(async (screen: TutorialScreen) => {
    await AsyncStorage.setItem(tutorialKeys[screen], "done");
    setTutorialsDone((current) => ({ ...current, [screen]: true }));
    setCurrentTutorialScreen(null);
  }, []);

  const resetFeatureTutorials = useCallback(async () => {
    await AsyncStorage.multiRemove(Object.values(tutorialKeys));
    setTutorialsDone({ dashboard: false, control: false, sessions: false, device: false });
    setCurrentTutorialScreen(null);
  }, []);

  const startTutorial = useCallback((screen: TutorialScreen) => {
    setCurrentTutorialScreen(screen);
  }, []);

  const skipAllTutorials = useCallback(async () => {
    await AsyncStorage.multiSet(Object.values(tutorialKeys).map((key) => [key, "done"]));
    setTutorialsDone({ dashboard: true, control: true, sessions: true, device: true });
    setCurrentTutorialScreen(null);
  }, []);

  const value = useMemo(
    () => ({
      onboardingDone,
      tutorialsDone,
      currentTutorialScreen,
      isLoadingTutorialState,
      markOnboardingDone,
      markTutorialDone,
      resetFeatureTutorials,
      startTutorial,
      skipAllTutorials,
    }),
    [
      currentTutorialScreen,
      isLoadingTutorialState,
      markOnboardingDone,
      markTutorialDone,
      onboardingDone,
      resetFeatureTutorials,
      skipAllTutorials,
      startTutorial,
      tutorialsDone,
    ],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}
