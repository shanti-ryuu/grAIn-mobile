declare module "react-native" {
  import type * as React from "react";

  export type StyleProp<T = unknown> = any;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;
  export type ColorValue = string;
  export type ColorSchemeName = "light" | "dark" | null;
  export type PlatformOSType = "ios" | "android" | "web" | string;
  export type NativeSyntheticEvent<T = unknown> = { nativeEvent: T };
  export type NativeScrollEvent = { contentOffset: { x: number; y: number } };
  export type GestureResponderEvent = Record<string, unknown>;

  export interface ViewProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    pointerEvents?: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: string;
  }

  export interface TextProps extends ViewProps {
    numberOfLines?: number;
  }

  export interface TextInputProps extends TextProps {
    value?: string;
    placeholder?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: string;
    keyboardType?: string;
    onChangeText?: (text: string) => void;
  }

  export class NativeEventEmitter {
    constructor(nativeModule?: unknown);
    addListener(eventType: string, listener: (...args: any[]) => void): { remove: () => void };
    emit(eventType: string, ...args: unknown[]): void;
    removeAllListeners(eventType?: string): void;
  }

  export interface TurboModule {}
  export const TurboModuleRegistry: {
    get: <T extends TurboModule = TurboModule>(name: string) => T | null;
    getEnforcing: <T extends TurboModule = TurboModule>(name: string) => T;
  };

  export const ActivityIndicator: React.ComponentType<ViewProps & Record<string, unknown>>;
  export class FlatList<ItemT = unknown> extends React.Component<ViewProps & Record<string, unknown>> {
    scrollToEnd: (params?: { animated?: boolean }) => void;
    scrollToIndex: (params: { animated?: boolean; index: number; viewOffset?: number; viewPosition?: number }) => void;
  }
  export const Image: React.ComponentType<ViewProps & Record<string, unknown>>;
  export const KeyboardAvoidingView: React.ComponentType<ViewProps & Record<string, unknown>>;
  export const Modal: React.ComponentType<ViewProps & Record<string, unknown>>;
  export const Pressable: React.ComponentType<ViewProps & Record<string, unknown>>;
  export const RefreshControl: React.ComponentType<ViewProps & Record<string, unknown>>;
  export const ScrollView: React.ComponentType<ViewProps & Record<string, unknown>>;
  export const StatusBar: React.ComponentType<ViewProps & Record<string, unknown>> & {
    setBarStyle: (...args: unknown[]) => void;
    setBackgroundColor: (...args: unknown[]) => void;
    setTranslucent: (...args: unknown[]) => void;
    setHidden: (...args: unknown[]) => void;
    setNetworkActivityIndicatorVisible: (...args: unknown[]) => void;
  };
  export const Switch: React.ComponentType<ViewProps & Record<string, unknown>>;
  export const Text: React.ComponentType<TextProps & Record<string, unknown>>;
  export const TextInput: React.ComponentType<TextInputProps & Record<string, unknown>>;
  export const View: React.ComponentType<ViewProps & Record<string, unknown>>;

  export const Animated: {
    Value: new (value: number) => any;
    View: React.ComponentType<Record<string, unknown>>;
    Text: React.ComponentType<Record<string, unknown>>;
    timing: (...args: unknown[]) => { start: (callback?: () => void) => void };
    spring: (...args: unknown[]) => { start: (callback?: () => void) => void };
    loop: (...args: unknown[]) => { start: () => void; stop: () => void };
    parallel: (...args: unknown[]) => { start: (callback?: () => void) => void };
    sequence: (...args: unknown[]) => unknown;
    delay: (duration: number) => unknown;
  };

  export const Appearance: {
    getColorScheme: () => "light" | "dark" | null;
    addChangeListener: (listener: (preferences: { colorScheme: "light" | "dark" | null }) => void) => {
      remove: () => void;
    };
  };

  export const Dimensions: {
    get: (dimension: "window" | "screen") => { width: number; height: number; scale: number; fontScale: number };
  };

  export const Platform: {
    OS: PlatformOSType;
    select: <T>(specifics: Record<string, T>) => T | undefined;
  };

  export const StyleSheet: {
    create: <T extends Record<string, Record<string, unknown>>>(styles: T) => T;
    absoluteFill: Record<string, unknown>;
    absoluteFillObject: Record<string, unknown>;
    flatten: (style: unknown) => Record<string, unknown>;
  };

  export function useColorScheme(): ColorSchemeName;
}

declare module "invariant" {
  export default function invariant(condition: unknown, message?: string): asserts condition;
}
