import { useFrame } from "@react-three/fiber/native";
import { useRef } from "react";
import * as THREE from "three";

interface TemperatureGlowProps {
  temperature: number;
  isRunning: boolean;
}

function glowConfig(temperature: number): { color: string; opacity: number } {
  if (temperature > 65) {
    return { color: "#FFCCBC", opacity: 0.12 };
  }
  if (temperature > 55) {
    return { color: "#FFF3E0", opacity: 0.08 };
  }
  if (temperature >= 38) {
    return { color: "#FFF8E1", opacity: 0.04 };
  }
  return { color: "#E3F2FD", opacity: 0.02 };
}

export function TemperatureGlow({ temperature, isRunning }: TemperatureGlowProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const config = glowConfig(temperature);

  useFrame(({ clock }) => {
    if (!materialRef.current || !isRunning) {
      return;
    }
    materialRef.current.opacity = config.opacity + Math.sin(clock.elapsedTime * 0.8) * 0.01;
  });

  return (
    <mesh>
      <sphereGeometry args={[1.8, 16, 16]} />
      <meshStandardMaterial
        ref={materialRef}
        color={config.color}
        transparent
        opacity={isRunning ? config.opacity : 0}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
