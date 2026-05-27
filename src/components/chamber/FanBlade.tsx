import { useFrame } from "@react-three/fiber/native";
import { useRef } from "react";
import * as THREE from "three";

import type { SwitchState } from "@/components/chamber/chamberTypes";

interface FanBladeProps {
  fanSpeed: number;
  fanState: SwitchState;
  position?: [number, number, number];
}

export function FanBlade({ fanSpeed, fanState, position = [0, 1.25, 0] }: FanBladeProps) {
  const fanRef = useRef<THREE.Group>(null);
  const currentSpeed = useRef(0);
  const targetSpeed = fanState === "ON" ? (fanSpeed / 100) * 0.3 : 0;

  useFrame(() => {
    if (!fanRef.current) {
      return;
    }
    currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, targetSpeed, 0.05);
    if (currentSpeed.current > 0.001) {
      fanRef.current.rotation.y += currentSpeed.current;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.15, 20]} />
        <meshStandardMaterial color="#455A64" roughness={0.25} metalness={0.7} />
      </mesh>
      <group ref={fanRef}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 18]} />
          <meshStandardMaterial color="#B0BEC5" roughness={0.2} metalness={0.8} />
        </mesh>
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rotation, index) => (
          <mesh key={`blade-${index}`} rotation={[0, rotation, 0]} position={[Math.cos(rotation) * 0.4, 0, Math.sin(rotation) * 0.4]}>
            <boxGeometry args={[0.8, 0.05, 0.2]} />
            <meshStandardMaterial color="#B0BEC5" roughness={0.2} metalness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
