import Svg, { Defs, LinearGradient as SvgGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";

import type { ChamberTelemetry } from "@/components/chamber/chamberTypes";
import { moistureColor } from "@/components/chamber/chamberTypes";

export function ChamberIllustration2D({
  temperature,
  moisture,
  fanSpeed,
  heaterState,
  isRunning,
  weight,
}: ChamberTelemetry) {
  const grainHeight = Math.max(32, Math.min(78, 32 + (weight / 50) * 46));
  const heatOpacity = heaterState === "ON" ? Math.min(0.8, 0.25 + temperature / 100) : 0.05;
  const airflowOpacity = isRunning ? Math.max(0.2, fanSpeed / 100) : 0.08;

  return (
    <Svg height="220" viewBox="0 0 360 220" width="100%">
      <Defs>
        <SvgGradient id="wall" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#E8F5E9" stopOpacity="0.75" />
          <Stop offset="1" stopColor="#2D5A27" stopOpacity="0.18" />
        </SvgGradient>
        <SvgGradient id="heat" x1="0" x2="0" y1="1" y2="0">
          <Stop offset="0" stopColor="#FF5722" stopOpacity={String(heatOpacity)} />
          <Stop offset="1" stopColor="#FFEBEE" stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Rect fill="url(#wall)" height="176" rx="16" stroke="#2D5A27" strokeWidth="4" width="270" x="45" y="22" />
      <Rect fill="url(#heat)" height="82" rx="12" width="240" x="60" y="108" />
      <Rect fill={moistureColor(moisture)} height={grainHeight} rx="10" width="230" x="65" y={188 - grainHeight} />
      <Path d="M120 54a60 18 0 1 0 120 0a60 18 0 1 0 -120 0" fill="#455A64" opacity="0.9" />
      <Path d="M180 38l18 16l-18 16l-18 -16z" fill="#B0BEC5" opacity="0.95" />
      <Path d="M120 72 C145 96 145 118 120 142" fill="none" opacity={airflowOpacity} stroke="#3B82F6" strokeDasharray="6 8" strokeWidth="4" />
      <Path d="M180 72 C205 102 155 122 180 152" fill="none" opacity={airflowOpacity} stroke="#3B82F6" strokeDasharray="6 8" strokeWidth="4" />
      <Path d="M240 72 C215 96 215 118 240 142" fill="none" opacity={airflowOpacity} stroke="#3B82F6" strokeDasharray="6 8" strokeWidth="4" />
      <Path d="M118 183 C130 166 140 166 152 183" fill="none" opacity={heatOpacity} stroke="#FF5722" strokeWidth="5" />
      <Path d="M168 183 C180 166 190 166 202 183" fill="none" opacity={heatOpacity} stroke="#FF5722" strokeWidth="5" />
      <Path d="M218 183 C230 166 240 166 252 183" fill="none" opacity={heatOpacity} stroke="#FF5722" strokeWidth="5" />
      <SvgText fill="#2D5A27" fontSize="12" fontWeight="700" x="180" y="212" textAnchor="middle">
        Static chamber fallback
      </SvgText>
    </Svg>
  );
}
