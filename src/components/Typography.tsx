import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

import { useTheme } from "@/context/ThemeContext";

type TextProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
};

function ThemedText({ children, style, variant }: TextProps & { variant: keyof typeof styles }) {
  const { theme } = useTheme();
  return <Text style={[styles[variant], { color: theme.textPrimary }, style]}>{children}</Text>;
}

export function H1(props: TextProps) {
  return <ThemedText {...props} variant="h1" />;
}

export function H2(props: TextProps) {
  return <ThemedText {...props} variant="h2" />;
}

export function H3(props: TextProps) {
  return <ThemedText {...props} variant="h3" />;
}

export function Body(props: TextProps) {
  return <ThemedText {...props} variant="body" />;
}

export function Caption(props: TextProps) {
  const { theme } = useTheme();
  return <Text style={[styles.caption, { color: theme.textSecondary }, props.style]}>{props.children}</Text>;
}

export function Mono(props: TextProps) {
  return <ThemedText {...props} variant="mono" />;
}

export function MonoLg(props: TextProps) {
  return <ThemedText {...props} variant="monoLg" />;
}

const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
  },
  h1: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 15,
    lineHeight: 22,
  },
  monoLg: {
    fontFamily: "monospace",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
});
