import { useFrame } from "@react-three/fiber/native";
import { useRef, useState } from "react";
import * as THREE from "three";

import type { SwitchState } from "@/components/chamber/chamberTypes";

interface HeaterElementProps {
  heaterState: SwitchState;
  temperature: number;
}

export function HeaterElement({ heaterState, temperature }: HeaterElementProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [lightIntensity, setLightIntensity] = useState(0);
  const isOn = heaterState === "ON";

  useFrame(({ clock }) => {
    const pulse = Math.sin(clock.elapsedTime * 3);
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = isOn ? 0.8 + pulse * 0.2 : 0;
    }
    setLightIntensity(isOn ? 1.5 + pulse * 0.3 : 0);
  });

  const heatMix = THREE.MathUtils.clamp((temperature - 35) / 40, 0, 1);
  const coilColor = isOn
    ? new THREE.Color("#FF5722").lerp(new THREE.Color("#FF1744"), heatMix)
    : new THREE.Color("#424242");

  return (
    <group position={[0, -1.28, 0]}>
      {[-0.7, 0, 0.7].map((x) => (
        <mesh key={`heater-${x}`} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.03, 8, 24]} />
          <meshStandardMaterial
            ref={x === 0 ? materialRef : undefined}
            color={coilColor}
            emissive={isOn ? "#FF3D00" : "#000000"}
            roughness={0.35}
            metalness={0.6}
          />
        </mesh>
      ))}
      <pointLight color="#FF5722" intensity={lightIntensity} distance={2} position={[0, 0.1, 0]} />
    </group>
  );
}
