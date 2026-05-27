import { useFrame } from "@react-three/fiber/native";
import { useMemo, useRef } from "react";
import { Platform } from "react-native";
import * as THREE from "three";

import { temperatureColor } from "@/components/chamber/chamberTypes";

interface AirflowParticlesProps {
  fanSpeed: number;
  isRunning: boolean;
  temperature: number;
}

type Particle = {
  position: THREE.Vector3;
  life: number;
  seed: number;
};

const PARTICLE_COUNT = Platform.OS === "android" ? 40 : 80;

function createParticle(index: number): Particle {
  return {
    position: new THREE.Vector3((Math.random() - 0.5) * 3, -1.1, (Math.random() - 0.5) * 2.2),
    life: Math.random(),
    seed: index * 0.73 + Math.random(),
  };
}

export function AirflowParticles({ fanSpeed, isRunning, temperature }: AirflowParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, index) => createParticle(index)), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const color = temperatureColor(temperature);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isRunning ? 0.55 : 0.12 }),
    [color, isRunning],
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }

    const time = clock.elapsedTime;
    particles.forEach((particle, index) => {
      if (isRunning && fanSpeed > 0) {
        particle.life += 0.008 + (fanSpeed / 100) * 0.015;
        particle.position.y += 0.02 + (fanSpeed / 100) * 0.04;
        particle.position.x += Math.sin(time + particle.seed) * 0.005;
        particle.position.z += Math.cos(time + particle.seed * 0.7) * 0.005;
      } else {
        particle.life += 0.003;
        particle.position.y -= 0.006;
      }

      if (particle.life >= 1 || particle.position.y > 1.25 || particle.position.y < -1.3) {
        particle.life = 0;
        particle.position.set((Math.random() - 0.5) * 3, -1.1, (Math.random() - 0.5) * 2.2);
      }

      const opacityScale = Math.sin(particle.life * Math.PI);
      const scale = 0.45 + opacityScale * 0.7;
      matrix.compose(particle.position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
      meshRef.current?.setMatrixAt(index, matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, material, PARTICLE_COUNT]}>
      <sphereGeometry args={[0.02, 5, 5]} />
    </instancedMesh>
  );
}
