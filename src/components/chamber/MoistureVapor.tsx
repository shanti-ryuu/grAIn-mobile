import { useFrame } from "@react-three/fiber/native";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { clamp } from "@/components/chamber/chamberTypes";

interface MoistureVaporProps {
  moisture: number;
  isRunning: boolean;
}

type Wisp = {
  position: THREE.Vector3;
  life: number;
  seed: number;
};

const WISP_COUNT = 30;

function createWisp(index: number): Wisp {
  return {
    position: new THREE.Vector3((Math.random() - 0.5) * 3.2, -0.9, (Math.random() - 0.5) * 2.2),
    life: Math.random(),
    seed: index * 0.61 + Math.random(),
  };
}

export function MoistureVapor({ moisture, isRunning }: MoistureVaporProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const wisps = useMemo(() => Array.from({ length: WISP_COUNT }, (_, index) => createWisp(index)), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const activeRatio = moisture > 20 ? 1 : moisture > 16 ? 0.5 : moisture > 15 ? 0.17 : 0;
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#E0F2F1",
        transparent: true,
        opacity: isRunning ? 0.15 * activeRatio : 0,
      }),
    [activeRatio, isRunning],
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    const visibleCount = Math.ceil(WISP_COUNT * activeRatio);
    wisps.forEach((wisp, index) => {
      const visible = isRunning && index < visibleCount;
      if (visible) {
        wisp.life += 0.006;
        wisp.position.y += 0.01 + (wisp.seed % 0.01);
        wisp.position.x += Math.sin(clock.elapsedTime * 0.5 + wisp.seed) * 0.008;
      } else {
        wisp.life += 0.002;
      }

      if (wisp.life >= 1 || wisp.position.y > 1.2) {
        wisp.life = 0;
        wisp.position.set((Math.random() - 0.5) * 3.2, -0.9, (Math.random() - 0.5) * 2.2);
      }

      const scale = visible ? clamp(0.5 + wisp.life, 0.5, 1.5) : 0.001;
      matrix.compose(wisp.position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
      meshRef.current?.setMatrixAt(index, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, material, WISP_COUNT]}>
      <sphereGeometry args={[0.06, 6, 6]} />
    </instancedMesh>
  );
}
