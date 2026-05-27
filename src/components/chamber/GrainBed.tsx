import { useFrame } from "@react-three/fiber/native";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { clamp, moistureColor } from "@/components/chamber/chamberTypes";

interface GrainBedProps {
  moisture: number;
  weight: number;
  isRunning: boolean;
}

function createGrainSurface(width: number, depth: number, height: number): THREE.BufferGeometry {
  const segments = 20;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let zIndex = 0; zIndex <= segments; zIndex += 1) {
    for (let xIndex = 0; xIndex <= segments; xIndex += 1) {
      const x = (xIndex / segments - 0.5) * width;
      const z = (zIndex / segments - 0.5) * depth;
      const ripple = Math.sin(x * 5) * Math.cos(z * 4) * 0.025;
      const noise = (Math.random() - 0.5) * 0.05;
      vertices.push(x, height / 2 + ripple + noise, z);
    }
  }

  for (let zIndex = 0; zIndex < segments; zIndex += 1) {
    for (let xIndex = 0; xIndex < segments; xIndex += 1) {
      const row = segments + 1;
      const a = zIndex * row + xIndex;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function GrainBed({ moisture, weight, isRunning }: GrainBedProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const grainHeight = clamp(0.3 + (weight / 50) * 0.8, 0.3, 1.1);
  const baseColor = moistureColor(moisture);
  const surfaceGeometry = useMemo(() => createGrainSurface(3.6, 2.6, grainHeight), [grainHeight]);

  useFrame(({ clock }) => {
    if (!materialRef.current || !isRunning) {
      return;
    }
    materialRef.current.roughness = 0.7 + Math.sin(clock.elapsedTime * 1.2) * 0.1;
  });

  return (
    <group position={[0, -1.48 + grainHeight / 2, 0]}>
      <mesh>
        <boxGeometry args={[3.6, grainHeight, 2.6]} />
        <meshStandardMaterial ref={materialRef} color={baseColor} roughness={0.8} metalness={0.02} />
      </mesh>
      <mesh geometry={surfaceGeometry} position={[0, 0, 0]}>
        <meshStandardMaterial color={baseColor} roughness={0.85} metalness={0.02} />
      </mesh>
    </group>
  );
}
