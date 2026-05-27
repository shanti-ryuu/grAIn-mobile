import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { darkTheme, lightTheme, Theme } from "@/utils/theme";

const THEME_KEY = "@grain_theme";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() === "dark");
  const [hasStoredPreference, setHasStoredPreference] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") {
        setHasStoredPreference(true);
        setIsDark(saved === "dark");
      }
    };

    void loadTheme();
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!hasStoredPreference) {
        setIsDark(colorScheme === "dark");
      }
    });

    return () => subscription.remove();
  }, [hasStoredPreference]);

  const toggleTheme = useCallback(async () => {
    const nextDark = !isDark;
    setHasStoredPreference(true);
    setIsDark(nextDark);
    await AsyncStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
  }, [isDark]);

  const value = useMemo(
    () => ({ theme: isDark ? darkTheme : lightTheme, isDark, toggleTheme }),
    [isDark, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
