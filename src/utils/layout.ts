import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_HEIGHT = 74;
export const TAB_BAR_BOTTOM_GAP = 0;
export const TAB_BAR_SIDE_INSET = 10;
export const FLOATING_ACTION_GAP = 18;

export function useBottomTabPadding(extra = 24): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + TAB_BAR_BOTTOM_GAP + extra;
}

export function useFloatingTabOffset(extra = FLOATING_ACTION_GAP): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + TAB_BAR_BOTTOM_GAP + extra;
}
