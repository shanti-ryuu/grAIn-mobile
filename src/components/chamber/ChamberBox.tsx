import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

const FRAME_COLOR = "#2D5A27";

function EdgeFrame() {
  const edges = useMemo(() => {
    const positions: Array<[number, number, number, number, number, number]> = [];
    const width = 4;
    const height = 3;
    const depth = 3;
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;
    const thickness = 0.05;

    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        positions.push([0, sy * y, sz * z, width, thickness, thickness]);
      }
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        positions.push([sx * x, 0, sz * z, thickness, height, thickness]);
      }
    }
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        positions.push([sx * x, sy * y, 0, thickness, thickness, depth]);
      }
    }

    return positions;
  }, []);

  return (
    <group>
      {edges.map(([x, y, z, width, height, depth], index) => (
        <mesh key={`edge-${index}`} position={[x, y, z]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function VentHoles() {
  const holes = useMemo(() => {
    const result: Array<[number, number, number]> = [];
    for (let row = -1; row <= 1; row += 1) {
      for (let column = -1; column <= 1; column += 1) {
        result.push([column * 0.45, 1.535, row * 0.45]);
      }
    }
    return result;
  }, []);

  return (
    <group>
      {holes.map((position, index) => (
        <mesh key={`vent-${index}`} position={position} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.025, 18]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function ChamberBox() {
  const { isDark } = useTheme();
  const wallColor = isDark ? "#1A2A1C" : "#E8F5E9";

  return (
    <group>
      <mesh position={[0, 0, -1.5]}>
        <boxGeometry args={[4, 3, 0.035]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.4} roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[-2, 0, 0]}>
        <boxGeometry args={[0.035, 3, 3]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.4} roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[2, 0, 0]}>
        <boxGeometry args={[0.035, 3, 3]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.4} roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[4, 0.035, 3]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.4} roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[4, 0.035, 3]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.4} roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, 1.5]}>
        <boxGeometry args={[4, 3, 0.025]} />
        <meshStandardMaterial
          color="#DDEFE1"
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0.05}
        />
      </mesh>
      <EdgeFrame />
      <VentHoles />
    </group>
  );
}
