import { Image, ImageStyle, StyleProp } from "react-native";

import { useTheme } from "@/context/ThemeContext";

const lightLogo = require("../../assets/grAIn_logo_light_1024.png");
const darkLogo = require("../../assets/grAIn_logo_dark_1024.png");

interface BrandLogoProps {
  style?: StyleProp<ImageStyle>;
}

export function BrandLogo({ style }: BrandLogoProps) {
  const { isDark } = useTheme();

  return <Image resizeMode="contain" source={isDark ? darkLogo : lightLogo} style={style} />;
}
