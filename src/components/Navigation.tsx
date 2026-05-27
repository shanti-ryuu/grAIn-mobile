import { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

export const tabs = [
  { name: "dashboard", icon: "grid", label: "Dashboard" },
  { name: "control", icon: "hardware-chip", label: "Control" },
  { name: "sessions", icon: "leaf", label: "Sessions" },
  { name: "analytics", icon: "bar-chart", label: "Analytics" },
  { name: "alerts", icon: "notifications", label: "Alerts" },
  { name: "settings", icon: "settings", label: "Settings" },
] as const;

export type TabName = (typeof tabs)[number]["name"];

export function tabScreenOptions(): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarHideOnKeyboard: true,
  };
}
